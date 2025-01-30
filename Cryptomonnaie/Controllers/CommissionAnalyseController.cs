using Microsoft.AspNetCore.Mvc;
using Npgsql;
using Cryptomonnaie.Models;

namespace Cryptomonnaie.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CommissionAnalyseController : ControllerBase
    {
        private readonly string _connectionString;
        private readonly ILogger<CommissionAnalyseController> _logger;

        public CommissionAnalyseController(ILogger<CommissionAnalyseController> logger)
        {
            _connectionString = "Server=postgres;Port=5432;Database=identity_db;User Id=postgres;Password=postgres_password;";
            _logger = logger;
        }

        private class TransactionData
        {
            public string Type { get; set; }
            public DateTime DateTransaction { get; set; }
            public decimal PrixUnitaire { get; set; }
            public decimal Quantite { get; set; }
            public string NomCrypto { get; set; }
        }

        private class CommissionData
        {
            public string Type { get; set; }
            public decimal Pourcentage { get; set; }
            public DateTime DateModification { get; set; }
        }

        [HttpGet("analyse")]
        public async Task<IActionResult> GetAnalyse(
            [FromQuery] string typeAnalyse,
            [FromQuery] string cryptoId,
            [FromQuery] DateTime dateDebut,
            [FromQuery] DateTime dateFin)
        {
            try
            {
                int cryptoIdInt = int.Parse(cryptoId);

                var commissions = await GetCommissions();
                var transactions = await GetTransactions(cryptoIdInt, dateDebut, dateFin);

                _logger.LogInformation($"Analyse demandée : Type={typeAnalyse}, CryptoId={cryptoIdInt}, " +
                    $"Transactions trouvées={transactions.Count}");

                var resultats = CalculateResults(transactions, commissions, typeAnalyse);
                return Ok(resultats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erreur lors de l'analyse des commissions. " +
                    $"Paramètres: typeAnalyse={typeAnalyse}, cryptoId={cryptoId}, " +
                    $"dateDebut={dateDebut}, dateFin={dateFin}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        private async Task<List<CommissionData>> GetCommissions()
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var query = "SELECT type, pourcentage, date_modification FROM Commission ORDER BY type, date_modification DESC";
            var commissions = new List<CommissionData>();

            using var cmd = new NpgsqlCommand(query, connection);
            using var reader = await cmd.ExecuteReaderAsync();
            
            while (await reader.ReadAsync())
            {
                commissions.Add(new CommissionData
                {
                    Type = reader.GetString(0),
                    Pourcentage = reader.GetDecimal(1),
                    DateModification = reader.GetDateTime(2)
                });
            }

            // Ajouter les valeurs par défaut si nécessaire
            if (!commissions.Any(c => c.Type == "BUY"))
            {
                commissions.Add(new CommissionData 
                { 
                    Type = "BUY", 
                    Pourcentage = 1.5m, 
                    DateModification = DateTime.MinValue 
                });
            }
            if (!commissions.Any(c => c.Type == "SELL"))
            {
                commissions.Add(new CommissionData 
                { 
                    Type = "SELL", 
                    Pourcentage = 1.0m, 
                    DateModification = DateTime.MinValue 
                });
            }

            return commissions;
        }

        private async Task<List<TransactionData>> GetTransactions(int cryptoId, DateTime dateDebut, DateTime dateFin)
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            // Construire la requête de base
            var query = @"
                SELECT 
                    t.type,
                    t.date_transaction,
                    t.prix_unitaire,
                    CASE t.type 
                        WHEN 'BUY' THEN t.quantiteEntree
                        ELSE t.quantiteSortie
                    END as quantite,
                    c.nom_crypto
                FROM Transaction t
                JOIN portefeuille_crypto pc ON t.id_portefeuille_crypto = pc.id_portefeuille_crypto
                JOIN Crypto c ON pc.id_crypto = c.id_crypto
                WHERE t.date_transaction BETWEEN @dateDebut AND @dateFin";

            // Ajouter la condition de filtrage par crypto seulement si cryptoId n'est pas 0
            if (cryptoId != 0)
            {
                query += " AND c.id_crypto = @cryptoId";
            }

            // Ajouter le tri
            query += " ORDER BY c.nom_crypto, t.date_transaction";

            using var cmd = new NpgsqlCommand(query, connection);
            cmd.Parameters.AddWithValue("@dateDebut", dateDebut);
            cmd.Parameters.AddWithValue("@dateFin", dateFin);
            
            // Ajouter le paramètre cryptoId seulement si nécessaire
            if (cryptoId != 0)
            {
                cmd.Parameters.AddWithValue("@cryptoId", cryptoId);
            }

            var transactions = new List<TransactionData>();
            using var reader = await cmd.ExecuteReaderAsync();
            
            while (await reader.ReadAsync())
            {
                transactions.Add(new TransactionData
                {
                    Type = reader.GetString(0),
                    DateTransaction = reader.GetDateTime(1),
                    PrixUnitaire = reader.GetDecimal(2),
                    Quantite = reader.GetDecimal(3),
                    NomCrypto = reader.GetString(4)
                });
            }

            _logger.LogInformation($"Requête exécutée : {query}");
            _logger.LogInformation($"Nombre de transactions trouvées : {transactions.Count}");

            return transactions;
        }

        private IEnumerable<object> CalculateResults(
            List<TransactionData> transactions, 
            List<CommissionData> commissions,
            string typeAnalyse)
        {
            var resultats = new Dictionary<string, (decimal total, int count, decimal min, decimal max)>();

            foreach (var transaction in transactions)
            {
                var applicableCommission = commissions
                    .Where(c => c.Type == transaction.Type && c.DateModification <= transaction.DateTransaction)
                    .OrderByDescending(c => c.DateModification)
                    .FirstOrDefault();

                if (applicableCommission == null)
                {
                    _logger.LogWarning($"Pas de commission trouvée pour le type {transaction.Type}");
                    continue;
                }

                var montantCommission = transaction.PrixUnitaire * transaction.Quantite * 
                    applicableCommission.Pourcentage / 100;

                if (!resultats.ContainsKey(transaction.NomCrypto))
                {
                    resultats[transaction.NomCrypto] = (0, 0, decimal.MaxValue, decimal.MinValue);
                }

                var current = resultats[transaction.NomCrypto];
                resultats[transaction.NomCrypto] = (
                    total: current.total + montantCommission,
                    count: current.count + 1,
                    min: Math.Min(current.min, applicableCommission.Pourcentage),
                    max: Math.Max(current.max, applicableCommission.Pourcentage)
                );
            }

            return resultats.Select(kvp => new
            {
                crypto = kvp.Key,
                resultat = typeAnalyse == "Moyenne" ? kvp.Value.total / kvp.Value.count : kvp.Value.total,
                nombreTransactions = kvp.Value.count,
                commissionMin = kvp.Value.min == decimal.MaxValue ? 0 : kvp.Value.min,
                commissionMax = kvp.Value.max == decimal.MinValue ? 0 : kvp.Value.max
            });
        }
    }
} 