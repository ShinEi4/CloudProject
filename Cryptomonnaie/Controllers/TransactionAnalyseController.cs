using Microsoft.AspNetCore.Mvc;
using Npgsql;
using System;
using System.Linq;

namespace Cryptomonnaie.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TransactionAnalyseController : ControllerBase
    {
        private readonly string _connectionString;
        private readonly ILogger<TransactionAnalyseController> _logger;

        public TransactionAnalyseController(ILogger<TransactionAnalyseController> logger)
        {
            _connectionString = "Server=postgres;Port=5432;Database=identity_db;User Id=postgres;Password=postgres_password;";
            _logger = logger;
        }

        private class TransactionData
        {
            public string NomCrypto { get; set; }
            public decimal PrixUnitaire { get; set; }
            public decimal Quantite { get; set; }
            public decimal MontantTotal => PrixUnitaire * Quantite;
        }

        [HttpGet("analyse")]
        public async Task<IActionResult> GetAnalyse(
            [FromQuery] string typeAnalyse,
            [FromQuery] string cryptoIds, // Liste d'IDs séparés par des virgules
            [FromQuery] DateTime dateDebut,
            [FromQuery] DateTime dateFin)
        {
            try
            {
                var transactions = await GetTransactions(cryptoIds, dateDebut, dateFin);
                var resultats = CalculateStatistics(transactions, typeAnalyse);
                return Ok(resultats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de l'analyse des transactions");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        private async Task<List<TransactionData>> GetTransactions(string cryptoIds, DateTime dateDebut, DateTime dateFin)
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var query = @"
                SELECT 
                    c.nom_crypto,
                    t.prix_unitaire,
                    CASE t.type 
                        WHEN 'BUY' THEN t.quantiteEntree
                        ELSE t.quantiteSortie
                    END as quantite
                FROM Transaction t
                JOIN portefeuille_crypto pc ON t.id_portefeuille_crypto = pc.id_portefeuille_crypto
                JOIN Crypto c ON pc.id_crypto = c.id_crypto
                WHERE t.date_transaction BETWEEN @dateDebut AND @dateFin";

            if (!string.IsNullOrEmpty(cryptoIds) && cryptoIds != "0")
            {
                query += " AND c.id_crypto = ANY(@cryptoIds)";
            }

            using var cmd = new NpgsqlCommand(query, connection);
            cmd.Parameters.AddWithValue("@dateDebut", dateDebut);
            cmd.Parameters.AddWithValue("@dateFin", dateFin);

            if (!string.IsNullOrEmpty(cryptoIds) && cryptoIds != "0")
            {
                var ids = cryptoIds.Split(',').Select(int.Parse).ToArray();
                cmd.Parameters.AddWithValue("@cryptoIds", ids);
            }

            var transactions = new List<TransactionData>();
            using var reader = await cmd.ExecuteReaderAsync();
            
            while (await reader.ReadAsync())
            {
                transactions.Add(new TransactionData
                {
                    NomCrypto = reader.GetString(0),
                    PrixUnitaire = reader.GetDecimal(1),
                    Quantite = reader.GetDecimal(2)
                });
            }

            return transactions;
        }

        private decimal CalculateFirstQuartile(List<decimal> values)
        {
            if (!values.Any()) return 0;
            
            // Trier les valeurs
            var sortedValues = values.OrderBy(v => v).ToList();
            var n = sortedValues.Count;
            
            // Si moins de 4 valeurs, retourner la plus petite
            if (n < 4) return sortedValues[0];
            
            // Calculer la position du premier quartile (Q1)
            // Utiliser la méthode de Tukey
            var position = (n - 1) * 0.25;
            
            // Gérer les cas limites
            if (position < 0) return sortedValues[0];
            if (position >= n - 1) return sortedValues[n - 1];
            
            // Calculer le quartile par interpolation
            var lowerIndex = (int)Math.Floor(position);
            var upperIndex = (int)Math.Ceiling(position);
            
            // Vérifier que les indices sont valides
            if (lowerIndex < 0) lowerIndex = 0;
            if (upperIndex >= n) upperIndex = n - 1;
            
            // Si les indices sont égaux, retourner la valeur directement
            if (lowerIndex == upperIndex)
                return sortedValues[lowerIndex];
            
            // Interpolation linéaire
            var lower = sortedValues[lowerIndex];
            var upper = sortedValues[upperIndex];
            var fraction = position - Math.Floor(position);
            
            return lower + (upper - lower) * (decimal)fraction;
        }

        private object CalculateStatistics(List<TransactionData> transactions, string typeAnalyse)
        {
            var resultats = transactions
                .GroupBy(t => t.NomCrypto)
                .Select(group =>
                {
                    var montants = group.Select(t => t.MontantTotal).OrderBy(m => m).ToList();
                    var count = montants.Count;
                    
                    var stats = new
                    {
                        crypto = group.Key,
                        nombreTransactions = count,
                        resultat = typeAnalyse switch
                        {
                            "Min" => montants.Any() ? montants.Min() : 0,
                            "Max" => montants.Any() ? montants.Max() : 0,
                            "Moyenne" => montants.Any() ? montants.Average() : 0,
                            "1erQuartile" => CalculateFirstQuartile(montants),
                            "EcartType" => CalculateStandardDeviation(montants),
                            _ => 0m
                        }
                    };

                    return stats;
                });

            return resultats;
        }

        private decimal CalculateStandardDeviation(List<decimal> values)
        {
            if (!values.Any()) return 0;

            var avg = values.Average();
            var sumOfSquaresOfDifferences = values.Select(val => (val - avg) * (val - avg)).Sum();
            var standardDeviation = Math.Sqrt((double)sumOfSquaresOfDifferences / values.Count);
            return (decimal)standardDeviation;
        }
    }
} 