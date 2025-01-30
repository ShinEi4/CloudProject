using Microsoft.AspNetCore.Mvc;
using Npgsql;
using Cryptomonnaie.Models;

namespace Cryptomonnaie.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PortfolioAnalyseController : ControllerBase
    {
        private readonly string _connectionString;
        private readonly ILogger<PortfolioAnalyseController> _logger;

        public PortfolioAnalyseController(ILogger<PortfolioAnalyseController> logger)
        {
            _connectionString = "Server=postgres;Port=5432;Database=identity_db;User Id=postgres;Password=postgres_password;";
            _logger = logger;
        }

        private class PortfolioData
        {
            public int UserId { get; set; }
            public string Username { get; set; }
            public decimal SoldeEuros { get; set; }
            public List<CryptoHolding> CryptoHoldings { get; set; } = new();
            public decimal TotalAchats { get; set; }
            public decimal TotalVentes { get; set; }
        }

        private class CryptoHolding
        {
            public string NomCrypto { get; set; }
            public decimal Montant { get; set; }
            public decimal ValeurActuelle { get; set; }
        }

        [HttpGet("analyse")]
        public async Task<IActionResult> GetAnalyse([FromQuery] DateTime dateFin)
        {
            try
            {
                using var connection = new NpgsqlConnection(_connectionString);
                await connection.OpenAsync();

                // 1. Récupérer les utilisateurs et leurs soldes
                var portfolios = await GetUserPortfolios(connection);

                // 2. Récupérer les cryptos de chaque utilisateur
                await GetCryptoHoldings(connection, portfolios, dateFin);

                // 3. Récupérer les totaux d'achats et ventes
                await GetTransactionTotals(connection, portfolios, dateFin);

                return Ok(portfolios);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de l'analyse des portefeuilles");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        private async Task<List<PortfolioData>> GetUserPortfolios(NpgsqlConnection connection)
        {
            var query = @"
                SELECT u.id_utilisateur, u.username, p.solde
                FROM Utilisateur u
                JOIN portefeuille p ON u.id_utilisateur = p.id_utilisateur
                ORDER BY u.username";

            using var cmd = new NpgsqlCommand(query, connection);
            var portfolios = new List<PortfolioData>();

            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                portfolios.Add(new PortfolioData
                {
                    UserId = reader.GetInt32(0),
                    Username = reader.GetString(1),
                    SoldeEuros = reader.GetDecimal(2)
                });
            }

            return portfolios;
        }

        private async Task GetCryptoHoldings(NpgsqlConnection connection, List<PortfolioData> portfolios, DateTime dateFin)
        {
            var query = @"
                SELECT 
                    pc.id_portefeuille,
                    c.nom_crypto,
                    pc.montant,
                    COALESCE(
                        (SELECT prix 
                         FROM prix_crypto 
                         WHERE id_crypto = c.id_crypto 
                         AND date_prix <= @dateFin
                         ORDER BY date_prix DESC 
                         LIMIT 1),
                        0
                    ) as prix_actuel
                FROM portefeuille_crypto pc
                JOIN Crypto c ON pc.id_crypto = c.id_crypto
                JOIN portefeuille p ON pc.id_portefeuille = p.id_portefeuille
                WHERE pc.montant > 0";

            using var cmd = new NpgsqlCommand(query, connection);
            cmd.Parameters.AddWithValue("@dateFin", dateFin);

            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var portefeuilleId = reader.GetInt32(0);
                var portfolio = portfolios.FirstOrDefault(p => p.UserId == portefeuilleId);
                if (portfolio != null)
                {
                    portfolio.CryptoHoldings.Add(new CryptoHolding
                    {
                        NomCrypto = reader.GetString(1),
                        Montant = reader.GetDecimal(2),
                        ValeurActuelle = reader.GetDecimal(2) * reader.GetDecimal(3)
                    });
                }
            }
        }

        private async Task GetTransactionTotals(NpgsqlConnection connection, List<PortfolioData> portfolios, DateTime dateFin)
        {
            var query = @"
                SELECT 
                    p.id_utilisateur,
                    SUM(CASE WHEN t.type = 'BUY' THEN t.prix_unitaire * t.quantiteEntree ELSE 0 END) as total_achats,
                    SUM(CASE WHEN t.type = 'SELL' THEN t.prix_unitaire * t.quantiteSortie ELSE 0 END) as total_ventes
                FROM Transaction t
                JOIN portefeuille_crypto pc ON t.id_portefeuille_crypto = pc.id_portefeuille_crypto
                JOIN portefeuille p ON pc.id_portefeuille = p.id_portefeuille
                WHERE t.date_transaction <= @dateFin
                GROUP BY p.id_utilisateur";

            using var cmd = new NpgsqlCommand(query, connection);
            cmd.Parameters.AddWithValue("@dateFin", dateFin);

            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var userId = reader.GetInt32(0);
                var portfolio = portfolios.FirstOrDefault(p => p.UserId == userId);
                if (portfolio != null)
                {
                    portfolio.TotalAchats = reader.GetDecimal(1);
                    portfolio.TotalVentes = reader.GetDecimal(2);
                }
            }
        }
    }
} 