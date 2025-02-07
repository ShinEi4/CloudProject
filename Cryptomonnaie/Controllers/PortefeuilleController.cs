using Microsoft.AspNetCore.Mvc;
using Npgsql;
using System.Text.Json;

namespace Cryptomonnaie.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PortefeuilleController : ControllerBase
    {
        private readonly string _connectionString;
        private readonly ILogger<PortefeuilleController> _logger;
        private readonly HttpClient _httpClient;
        
        private const string _firebaseProjectId = "cloud-project-bd903";
        private const string _firebaseApiKey = "AIzaSyBH8d8E09Pp4jPTsg18vDv1blm3ngtMgwU";

        public PortefeuilleController(IConfiguration configuration, ILogger<PortefeuilleController> logger, HttpClient httpClient)
        {
            _connectionString = "Server=postgres;Port=5432;Database=identity_db;User Id=postgres;Password=postgres_password;";
            _logger = logger;
            _httpClient = httpClient;
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
                // 1. Récupérer et synchroniser les demandes de Firebase
                var baseUrl = $"https://firestore.googleapis.com/v1/projects/{_firebaseProjectId}/databases/(default)/documents";
                var url = $"{baseUrl}/demandes?key={_firebaseApiKey}";
                
                using var connection = new NpgsqlConnection(_connectionString);
                await connection.OpenAsync();
                
                try
                {
                    var firebaseResponse = await _httpClient.GetAsync(url);
                    if (!firebaseResponse.IsSuccessStatusCode)
                    {
                        _logger.LogError("Échec de la récupération des demandes Firebase. Status: {Status}", firebaseResponse.StatusCode);
                        return StatusCode(500, new { message = "Erreur lors de la récupération des demandes Firebase" });
                    }

                    var firebaseContent = await firebaseResponse.Content.ReadAsStringAsync();
                    if (string.IsNullOrEmpty(firebaseContent))
                    {
                        _logger.LogError("Firebase a renvoyé une réponse vide");
                        return StatusCode(500, new { message = "Erreur: réponse Firebase vide" });
                    }

                    var firebaseData = JsonSerializer.Deserialize<JsonElement>(firebaseContent);
                    if (!firebaseData.TryGetProperty("documents", out JsonElement documents))
                    {
                        _logger.LogInformation("Aucune demande trouvée dans Firebase");
                        // On continue car c'est un cas valide (pas de nouvelles demandes)
                    }
                    else
                    {
                        // Utiliser une transaction pour la migration
                        using var transaction = await connection.BeginTransactionAsync();
                        try
                        {
                            foreach (var doc in documents.EnumerateArray())
                            {
                                var fields = doc.GetProperty("fields");
                                var demandeType = fields.GetProperty("type").GetProperty("stringValue").GetString();

                                // Vérifier si les données sont valides avant l'insertion
                                try 
                                {
                                    var email = fields.GetProperty("email").GetProperty("stringValue").GetString();
                                    
                                    // Gérer à la fois les valeurs entières et décimales pour le montant
                                    var montantElement = fields.GetProperty("montant");
                                    double montant;
                                    if (montantElement.TryGetProperty("doubleValue", out var doubleValue))
                                    {
                                        montant = doubleValue.GetDouble();
                                    }
                                    else if (montantElement.TryGetProperty("integerValue", out var intValue))
                                    {
                                        montant = double.Parse(intValue.GetString());
                                    }
                                    else
                                    {
                                        throw new Exception("Format de montant invalide");
                                    }
                                    
                                    // Conversion de la date ISO 8601 en DateTime UTC
                                    var dateString = fields.GetProperty("dateCreation").GetProperty("stringValue").GetString();
                                    var dateCreation = DateTime.Parse(dateString, null, System.Globalization.DateTimeStyles.RoundtripKind);

                                    // Appliquer les filtres si nécessaire
                                    if (string.IsNullOrEmpty(type) || demandeType == type)
                                    {
                                        // Trouver l'ID du portefeuille à partir de l'email
                                        var portefeuilleQuery = @"
                                            SELECT p.id_portefeuille 
                                            FROM portefeuille p 
                                            JOIN Utilisateur u ON p.id_utilisateur = u.id_utilisateur 
                                            WHERE u.email = @email";

                                        using var portefeuilleCmd = new NpgsqlCommand(portefeuilleQuery, connection);
                                        portefeuilleCmd.Parameters.AddWithValue("@email", email);
                                        var portefeuilleId = await portefeuilleCmd.ExecuteScalarAsync() as int?;

                                        if (!portefeuilleId.HasValue)
                                        {
                                            await transaction.RollbackAsync();
                                            _logger.LogError("Portefeuille non trouvé pour l'email: {Email}", email);
                                            return StatusCode(500, new { message = $"Portefeuille non trouvé pour l'email: {email}" });
                                        }

                                        // Log des valeurs avant l'insertion
                                        _logger.LogInformation(
                                            "Insertion demande - Type: {Type}, Montant: {Montant}, Date: {Date}, PortefeuilleId: {PortefeuilleId}",
                                            demandeType,
                                            montant,
                                            dateCreation,
                                            portefeuilleId.Value
                                        );

                                        // Insérer la demande dans PostgreSQL avec timestamp
                                        var insertQuery = @"
                                            INSERT INTO fond_transaction 
                                            (type, montant, date_transaction, id_portefeuille, is_validate)
                                            VALUES (@type, @montant, @date::timestamp, @portefeuilleId, NULL)";

                                        using var insertCmd = new NpgsqlCommand(insertQuery, connection);
                                        insertCmd.Parameters.AddWithValue("@type", demandeType);
                                        insertCmd.Parameters.AddWithValue("@montant", montant);
                                        insertCmd.Parameters.AddWithValue("@date", dateCreation);
                                        insertCmd.Parameters.AddWithValue("@portefeuilleId", portefeuilleId.Value);

                                        await insertCmd.ExecuteNonQueryAsync();
                                    }
                                }
                                catch (Exception ex)
                                {
                                    await transaction.RollbackAsync();
                                    _logger.LogError(ex, "Erreur lors du traitement de la demande Firebase. Données: {Data}", 
                                        JsonSerializer.Serialize(fields));
                                    return StatusCode(500, new { message = "Erreur lors du traitement des données de la demande" });
                                }
                            }
                            await transaction.CommitAsync();
                        }
                        catch (Exception ex)
                        {
                            await transaction.RollbackAsync();
                            _logger.LogError(ex, "Erreur lors de la migration des demandes Firebase vers PostgreSQL");
                            return StatusCode(500, new { message = "Erreur lors de la migration des demandes" });
                        }
                    }

                    // 2. Récupérer toutes les demandes de PostgreSQL
                    var whereConditions = new List<string>();
                    var parameters = new List<NpgsqlParameter>();

                    if (!string.IsNullOrEmpty(type))
                    {
                        whereConditions.Add("ft.type = @type");
                        parameters.Add(new NpgsqlParameter("@type", type));
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
                    _logger.LogError(ex, "Erreur lors de la communication avec Firebase");
                    return StatusCode(500, new { message = "Erreur lors de la communication avec Firebase" });
                }
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