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

        [HttpGet("{userId}")]
        public async Task<IActionResult> GetWallet(int userId)
        {
            try
            {
                using var connection = GetConnection();
                await connection.OpenAsync();

                var query = @"
                    SELECT id_portefeuille, solde 
                    FROM portefeuille 
                    WHERE id_utilisateur = @userId";

                using var command = new NpgsqlCommand(query, connection);
                command.Parameters.AddWithValue("@userId", userId);

                using var reader = await command.ExecuteReaderAsync();
                
                if (await reader.ReadAsync())
                {
                    return Ok(new { 
                        id_portefeuille = reader.GetInt32(0),
                        solde = reader.GetDecimal(1)
                    });
                }
                
                return NotFound(new { message = "Wallet not found" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching wallet for user {UserId}", userId);
                return StatusCode(500, new { message = "Error fetching wallet information" });
            }
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

        [HttpPost("{walletId}/deposit")]
        public async Task<IActionResult> Deposit(int walletId, [FromBody] TransactionRequest request)
        {
            try
            {
                using var connection = GetConnection();
                await connection.OpenAsync();

                var query = @"
                    INSERT INTO fond_transaction (type, montant, date_transaction, id_portefeuille)
                    VALUES ('DEPOSIT', @amount, NOW(), @walletId)
                    RETURNING id_fond";

                using var command = new NpgsqlCommand(query, connection);
                command.Parameters.AddWithValue("@amount", request.Amount);
                command.Parameters.AddWithValue("@walletId", walletId);

                var transactionId = await command.ExecuteScalarAsync();
                return Ok(new { id_transaction = transactionId });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating deposit for wallet {WalletId}", walletId);
                return StatusCode(500, new { message = "Error processing deposit" });
            }
        }

        [HttpPost("{walletId}/withdraw")]
        public async Task<IActionResult> Withdraw(int walletId, [FromBody] TransactionRequest request)
        {
            try
            {
                using var connection = GetConnection();
                await connection.OpenAsync();

                // First check if there's enough balance
                var balanceQuery = @"
                    SELECT solde 
                    FROM portefeuille 
                    WHERE id_portefeuille = @walletId";

                using var balanceCommand = new NpgsqlCommand(balanceQuery, connection);
                balanceCommand.Parameters.AddWithValue("@walletId", walletId);

                var currentBalance = (decimal)await balanceCommand.ExecuteScalarAsync();
                
                if (currentBalance < request.Amount)
                {
                    return BadRequest(new { message = "Insufficient funds" });
                }

                var query = @"
                    INSERT INTO fond_transaction (type, montant, date_transaction, id_portefeuille)
                    VALUES ('WITHDRAW', @amount, NOW(), @walletId)
                    RETURNING id_fond";

                using var command = new NpgsqlCommand(query, connection);
                command.Parameters.AddWithValue("@amount", request.Amount);
                command.Parameters.AddWithValue("@walletId", walletId);

                var transactionId = await command.ExecuteScalarAsync();
                return Ok(new { id_transaction = transactionId });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating withdrawal for wallet {WalletId}", walletId);
                return StatusCode(500, new { message = "Error processing withdrawal" });
            }
        }
    }

    public class CreateWalletRequest
    {
        public int UserId { get; set; }
    }

    public class TransactionRequest
    {
        public decimal Amount { get; set; }
    }
} 