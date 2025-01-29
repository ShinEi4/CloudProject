using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace Cryptomonnaie.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PortefeuilleController : ControllerBase
    {
        private readonly string _connectionString;
        private readonly ILogger<PortefeuilleController> _logger;

        public PortefeuilleController(IConfiguration configuration, ILogger<PortefeuilleController> logger)
        {
            _connectionString = "Server=postgres;Port=5432;Database=identity_db;User Id=postgres;Password=postgres_password;";
            _logger = logger;
        }

        public NpgsqlConnection GetConnection()
        {
            return new NpgsqlConnection(_connectionString);
        }

        [HttpPost("create")]
        public async Task<IActionResult> CreateWallet([FromBody] CreateWalletRequest request)
        {
            try
            {
                using var connection = GetConnection();
                await connection.OpenAsync();

                var query = @"
                    INSERT INTO portefeuille (id_utilisateur, solde)
                    VALUES (@userId, 10)
                    RETURNING id_portefeuille";

                using var command = new NpgsqlCommand(query, connection);
                command.Parameters.AddWithValue("@userId", request.UserId);

                var walletId = await command.ExecuteScalarAsync();
                return Ok(new { id_portefeuille = walletId });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating wallet for user {UserId}", request.UserId);
                return StatusCode(500, "Error creating wallet");
            }
        }
    }

    public class CreateWalletRequest
    {
        public int UserId { get; set; }
    }
} 