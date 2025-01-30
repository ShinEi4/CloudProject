using Microsoft.AspNetCore.Mvc;
using Npgsql;
using System.Data;
using Microsoft.Extensions.Logging;

namespace Cryptomonnaie.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CryptoController : ControllerBase
    {
        private readonly string _connectionString;
        private readonly ILogger<CryptoController> _logger;

        public CryptoController(ILogger<CryptoController> logger)
        {
            _connectionString = "Server=postgres;Port=5432;Database=identity_db;User Id=postgres;Password=postgres_password;";
            _logger = logger;
        }

        [HttpGet("prices")]
        public async Task<IActionResult> GetLatestPrices()
        {
            try
            {
                using var connection = new NpgsqlConnection(_connectionString);
                await connection.OpenAsync();
                
                var query = @"
                    WITH LatestPrices AS (
                        SELECT DISTINCT ON (pc.id_crypto)
                            c.id_crypto,
                            c.nom_crypto,
                            pc.prix,
                            pc.date_prix,
                            LAG(pc.prix) OVER (PARTITION BY pc.id_crypto ORDER BY pc.date_prix) as prix_precedent
                        FROM crypto c
                        JOIN prix_crypto pc ON c.id_crypto = pc.id_crypto
                        ORDER BY pc.id_crypto, pc.date_prix DESC
                    )
                    SELECT 
                        id_crypto,
                        nom_crypto,
                        prix,
                        date_prix,
                        CASE 
                            WHEN prix_precedent IS NULL THEN 0
                            ELSE ((prix - prix_precedent) / prix_precedent * 100)
                        END as variation_pourcentage
                    FROM LatestPrices";

                using var cmd = new NpgsqlCommand(query, connection);
                var result = new List<object>();
                
                using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    var variation = reader.GetDouble(4);
                    var prix = reader.GetDecimal(2);
                    
                    result.Add(new
                    {
                        id = reader.GetInt32(0),
                        crypto = reader.GetString(1),
                        prix = prix,
                        date = reader.GetDateTime(3),
                        variation = variation,
                        percentage = Math.Min(100, Math.Max(0, (double)prix / 200 * 100)),
                        cssClass = variation switch
                        {
                            var x when x > 5 => "bg-success",
                            var x when x > 0 => "bg-primary",
                            var x when x > -5 => "bg-warning",
                            _ => "bg-danger"
                        }
                    });
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la récupération des prix");
                return StatusCode(500, "Erreur interne du serveur");
            }
        }
    }
} 