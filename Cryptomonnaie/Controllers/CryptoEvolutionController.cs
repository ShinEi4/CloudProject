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
                    SELECT c.nom_crypto, pc.prix, pc.date_prix
                    FROM prix_crypto pc
                    JOIN crypto c ON c.id_crypto = pc.id_crypto
                    WHERE pc.date_prix >= NOW() - INTERVAL '3 days'
                    ORDER BY c.nom_crypto, pc.date_prix";

                using var command = new NpgsqlCommand(query, connection);
                using var reader = await command.ExecuteReaderAsync();

                var evolution = new Dictionary<string, List<object>>();

                while (await reader.ReadAsync())
                {
                    var crypto = reader.GetString(0);
                    var price = reader.GetDecimal(1);
                    var date = reader.GetDateTime(2);

                    if (!evolution.ContainsKey(crypto))
                    {
                        evolution[crypto] = new List<object>();
                    }

                    evolution[crypto].Add(new
                    {
                        price = price,
                        date = date
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