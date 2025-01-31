using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace Cryptomonnaie.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CryptoEvolutionController : ControllerBase
    {
        private readonly string _connectionString;
        private readonly ILogger<CryptoEvolutionController> _logger;

        public CryptoEvolutionController(IConfiguration configuration, ILogger<CryptoEvolutionController> logger)
        {
            _connectionString = "Server=postgres;Port=5432;Database=identity_db;User Id=postgres;Password=postgres_password;";
            _logger = logger;
        }

        [HttpGet("evolution")]
        public async Task<IActionResult> GetEvolution()
        {
            try
            {
                using var connection = new NpgsqlConnection(_connectionString);
                await connection.OpenAsync();

                var query = @"
                    WITH time_buckets AS (
                        SELECT 
                            c.nom_crypto,
                            date_trunc('hour', pc.date_prix) + 
                                INTERVAL '5 min' * (extract(minute from pc.date_prix)::integer / 5) as bucket_time,
                            AVG(pc.prix) as avg_price
                        FROM prix_crypto pc
                        JOIN crypto c ON c.id_crypto = pc.id_crypto
                        WHERE pc.date_prix >= NOW() - INTERVAL '1 day'
                        GROUP BY 
                            c.nom_crypto,
                            date_trunc('hour', pc.date_prix) + 
                                INTERVAL '5 min' * (extract(minute from pc.date_prix)::integer / 5)
                    )
                    SELECT 
                        nom_crypto,
                        avg_price as prix,
                        bucket_time as date_prix
                    FROM time_buckets
                    ORDER BY nom_crypto, bucket_time ASC";

                using var command = new NpgsqlCommand(query, connection);
                using var reader = await command.ExecuteReaderAsync();

                var evolution = new Dictionary<string, List<object>>();

                while (await reader.ReadAsync())
                {
                    var crypto = reader.GetString(0);
                    var price = reader.GetDecimal(1);
                    var date = reader.GetDateTime(2).ToUniversalTime();

                    if (!evolution.ContainsKey(crypto))
                    {
                        evolution[crypto] = new List<object>();
                    }

                    evolution[crypto].Add(new
                    {
                        price = price,
                        date = date.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'")
                    });
                }

                return Ok(evolution);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching crypto evolution");
                return StatusCode(500, new { message = "Error fetching crypto evolution data" });
            }
        }
    }
} 