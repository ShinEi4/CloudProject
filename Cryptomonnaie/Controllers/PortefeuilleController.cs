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

        [HttpGet("demandes")]
        public async Task<IActionResult> GetDemandes([FromQuery] string? type = null, [FromQuery] string? statut = null)
        {
            try
            {
                using var connection = new NpgsqlConnection(_connectionString);
                await connection.OpenAsync();

                var whereConditions = new List<string>();
                var parameters = new List<NpgsqlParameter>();

                if (!string.IsNullOrEmpty(type))
                {
                    whereConditions.Add("ft.type = @type");
                    parameters.Add(new NpgsqlParameter("@type", type));
                }

                if (!string.IsNullOrEmpty(statut))
                {
                    whereConditions.Add("ft.statut = @statut");
                    parameters.Add(new NpgsqlParameter("@statut", statut));
                }

                var whereClause = whereConditions.Count > 0 
                    ? "WHERE " + string.Join(" AND ", whereConditions)
                    : "";

                var query = $@"
                    SELECT 
                        ft.id_fond,
                        ft.date_transaction,
                        ft.type,
                        ft.montant,
                        u.username
                    FROM fond_transaction ft
                    JOIN portefeuille p ON ft.id_portefeuille = p.id_portefeuille
                    JOIN Utilisateur u ON p.id_utilisateur = u.id_utilisateur
                    WHERE ft.is_validate IS NULL
                    {(whereClause != "" ? "AND " + whereClause.Substring(6) : "")}
                    ORDER BY ft.date_transaction DESC";

                using var cmd = new NpgsqlCommand(query, connection);
                foreach (var param in parameters)
                {
                    cmd.Parameters.Add(param);
                }

                var demandes = new List<object>();
                using var reader = await cmd.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    demandes.Add(new
                    {
                        id = reader.GetInt32(0),
                        date = reader.GetDateTime(1),
                        type = reader.GetString(2),
                        montant = reader.GetDecimal(3),
                        username = reader.GetString(4)
                    });
                }

                return Ok(demandes);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la récupération des demandes");
                return StatusCode(500, new { message = "Erreur lors de la récupération des demandes" });
            }
        }

        [HttpPost("valider/{id}")]
        public async Task<IActionResult> ValiderDemande(int id, [FromBody] ValidationRequest request)
        {
            try
            {
                using var connection = GetConnection();
                await connection.OpenAsync();
                using var transaction = await connection.BeginTransactionAsync();

                try
                {
                    // 1. Get transaction info
                    var queryInfo = @"
                        SELECT ft.type, ft.montant, ft.id_portefeuille, ft.is_validate
                        FROM fond_transaction ft
                        WHERE ft.id_fond = @id";

                    using var cmdInfo = new NpgsqlCommand(queryInfo, connection);
                    cmdInfo.Parameters.AddWithValue("@id", id);

                    using var reader = await cmdInfo.ExecuteReaderAsync();
                    if (!await reader.ReadAsync())
                    {
                        return NotFound(new { message = "Transaction not found" });
                    }

                    var type = reader.GetString(0);
                    var montant = reader.GetDecimal(1);
                    var portefeuilleId = reader.GetInt32(2);
                    var isValidate = !reader.IsDBNull(3) ? reader.GetBoolean(3) : (bool?)null;

                    reader.Close();

                    if (isValidate.HasValue)
                    {
                        return BadRequest(new { message = "Transaction already processed" });
                    }

                    // 2. Update transaction status
                    var updateQuery = @"
                        UPDATE fond_transaction 
                        SET is_validate = @isValidate
                        WHERE id_fond = @id";

                    using var cmdUpdate = new NpgsqlCommand(updateQuery, connection);
                    cmdUpdate.Parameters.AddWithValue("@id", id);
                    cmdUpdate.Parameters.AddWithValue("@isValidate", request.Decision == "approved");
                    await cmdUpdate.ExecuteNonQueryAsync();

                    // 3. If approved, update wallet balance
                    if (request.Decision == "approved")
                    {
                        // For WITHDRAW, first check if there's enough balance
                        if (type == "WITHDRAW")
                        {
                            var balanceQuery = @"
                                SELECT solde 
                                FROM portefeuille 
                                WHERE id_portefeuille = @portefeuilleId";

                            using var balanceCmd = new NpgsqlCommand(balanceQuery, connection);
                            balanceCmd.Parameters.AddWithValue("@portefeuilleId", portefeuilleId);
                            var currentBalance = (decimal)await balanceCmd.ExecuteScalarAsync();

                            if (currentBalance < montant)
                            {
                                await transaction.RollbackAsync();
                                return BadRequest(new { message = "Insufficient funds" });
                            }
                        }

                        var updateBalance = @"
                            UPDATE portefeuille 
                            SET solde = solde + @amount
                            WHERE id_portefeuille = @portefeuilleId";

                        using var cmdBalance = new NpgsqlCommand(updateBalance, connection);
                        cmdBalance.Parameters.AddWithValue("@portefeuilleId", portefeuilleId);
                        cmdBalance.Parameters.AddWithValue("@amount", type switch
                        {
                            "DEPOSIT" => montant,
                            "WITHDRAW" => -montant,
                            _ => throw new InvalidOperationException($"Invalid transaction type: {type}")
                        });
                        await cmdBalance.ExecuteNonQueryAsync();
                    }

                    await transaction.CommitAsync();
                    return Ok(new { message = "Transaction processed successfully" });
                }
                catch (Exception)
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing transaction {Id}", id);
                return StatusCode(500, new { message = "Error processing transaction" });
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

    public class ValidationRequest
    {
        public string Decision { get; set; } // "approved" or "rejected"
    }
} 