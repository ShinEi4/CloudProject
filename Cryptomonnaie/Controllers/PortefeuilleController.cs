using Microsoft.AspNetCore.Mvc;
using Npgsql;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text;
using Microsoft.Extensions.Options;
using Cryptomonnaie.Config;

namespace Cryptomonnaie.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PortefeuilleController : ControllerBase
    {
        private readonly string _connectionString;
        private readonly ILogger<PortefeuilleController> _logger;
        private readonly HttpClient _httpClient;
        private readonly FirebaseSettings _firebaseSettings;

        public PortefeuilleController(
            IConfiguration configuration,
            ILogger<PortefeuilleController> logger,
            HttpClient httpClient,
            IOptions<FirebaseSettings> firebaseSettings)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection");
            _logger = logger;
            _httpClient = httpClient;
            _firebaseSettings = firebaseSettings.Value;
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
                    return Ok(new
                    {
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
        public async Task<IActionResult> GetDemandes([FromQuery] string? type = null)
        {
            try
            {
                var url = $"{_firebaseSettings.FirestoreUrl}/demandes?key={_firebaseSettings.ApiKey}";

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
                                var statutFb = fields.GetProperty("statut").GetProperty("stringValue").GetString();
                                var lu = fields.GetProperty("lu").GetProperty("booleanValue").GetBoolean();

                                // Ne traiter que les demandes en attente et non lues
                                if (statutFb == "EN_ATTENTE" && !lu)
                                {
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

                                            // Après l'insertion réussie dans PostgreSQL, mettre à jour lu=true dans Firebase
                                            var documentPath = doc.GetProperty("name").GetString();
                                            // Extraire uniquement le chemin relatif si c'est une URL complète
                                            var relativePath = documentPath.Contains("/documents/")
                                                ? documentPath.Split("/documents/")[1]
                                                : documentPath;

                                            var updateUrl = $"{_firebaseSettings.FirestoreUrl}/{relativePath}?key={_firebaseSettings.ApiKey}";

                                            var updateData = new
                                            {
                                                fields = new
                                                {
                                                    userId = new { stringValue = fields.GetProperty("userId").GetProperty("stringValue").GetString() },
                                                    email = new { stringValue = email },
                                                    type = new { stringValue = demandeType },
                                                    montant = montantElement,  // Réutiliser l'élément montant existant
                                                    dateCreation = new { stringValue = dateCreation.ToString("yyyy-MM-ddTHH:mm:ss.fffZ") },
                                                    statut = new { stringValue = "EN_ATTENTE" },
                                                    lu = new { booleanValue = true }
                                                }
                                            };

                                            var updateContent = new StringContent(
                                                JsonSerializer.Serialize(updateData),
                                                Encoding.UTF8,
                                                "application/json"
                                            );

                                            _logger.LogInformation("Mise à jour Firebase URL: {Url}", updateUrl);
                                            var updateResponse = await _httpClient.PatchAsync(updateUrl, updateContent);
                                            if (!updateResponse.IsSuccessStatusCode)
                                            {
                                                await transaction.RollbackAsync();
                                                var errorContent = await updateResponse.Content.ReadAsStringAsync();
                                                _logger.LogError("Échec de la mise à jour Firebase. Status: {Status}, Error: {Error}",
                                                    updateResponse.StatusCode, errorContent);
                                                return StatusCode(500, new { message = "Erreur lors de la mise à jour du statut dans Firebase" });
                                            }
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
                    // 1. Get transaction info and Firebase ID
                    var queryInfo = @"
                        SELECT ft.type, ft.montant, ft.id_portefeuille, ft.is_validate, 
                               u.email, ft.date_transaction
                        FROM fond_transaction ft
                        JOIN portefeuille p ON ft.id_portefeuille = p.id_portefeuille
                        JOIN Utilisateur u ON p.id_utilisateur = u.id_utilisateur
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
                    var email = reader.GetString(4);
                    var dateTransaction = reader.GetDateTime(5);

                    reader.Close();

                    if (isValidate.HasValue)
                    {
                        return BadRequest(new { message = "Transaction already processed" });
                    }

                    // Récupérer le FCM token depuis Firebase
                    var searchUrl = $"{_firebaseSettings.FirestoreUrl}/fcmToken?key={_firebaseSettings.ApiKey}";
                    var searchResponse = await _httpClient.GetAsync(searchUrl);

                    string fcmToken = null;
                    if (searchResponse.IsSuccessStatusCode)
                    {
                        var content = await searchResponse.Content.ReadAsStringAsync();
                        var firebaseData = JsonSerializer.Deserialize<JsonElement>(content);

                        if (firebaseData.TryGetProperty("documents", out JsonElement documents))
                        {
                            foreach (var doc in documents.EnumerateArray())
                            {
                                var fields = doc.GetProperty("fields");
                                if (fields.TryGetProperty("email", out JsonElement emailField) &&
                                    emailField.GetProperty("stringValue").GetString() == email)
                                {
                                    if (fields.TryGetProperty("fcmToken", out JsonElement tokenField))
                                    {
                                        fcmToken = tokenField.GetProperty("stringValue").GetString();
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    // Si on a un FCM token, envoyer la notification
                    if (!string.IsNullOrEmpty(fcmToken))
                    {
                        try
                        {
                            var expoPushMessage = new
                            {
                                to = fcmToken,
                                sound = "default",
                                title = $"{(type == "WITHDRAW" ? "Retrait" : "Dépôt")} {(request.Decision == "approved" ? "approuvé" : "refusé")}",
                                body = $"Votre demande de {(type == "WITHDRAW" ? "retrait" : "dépôt")} de {montant}€ a été {(request.Decision == "approved" ? "approuvée" : "refusée")}",
                                data = new
                                {
                                    transactionId = id,
                                    type = type == "WITHDRAW" ? "retrait" : "dépôt",
                                    montant = montant.ToString(),
                                    status = request.Decision
                                }
                            };

                            var pushJson = JsonSerializer.Serialize(expoPushMessage);
                            var pushRequest = new HttpRequestMessage(HttpMethod.Post, "https://exp.host/--/api/v2/push/send");

                            // Ajouter seulement les en-têtes Accept
                            pushRequest.Headers.Add("Accept", "application/json");
                            pushRequest.Headers.Add("Accept-encoding", "gzip, deflate");

                            // Créer le contenu avec le type de contenu
                            pushRequest.Content = new StringContent(
                                pushJson,
                                Encoding.UTF8,
                                "application/json"  // Content-Type est défini ici
                            );

                            var pushResponse = await _httpClient.SendAsync(pushRequest);

                            if (!pushResponse.IsSuccessStatusCode)
                            {
                                var errorContent = await pushResponse.Content.ReadAsStringAsync();
                                _logger.LogError("Erreur lors de l'envoi de la notification Expo: {Status} {Error}",
                                    pushResponse.StatusCode, errorContent);
                            }
                            else
                            {
                                _logger.LogInformation("Notification Expo envoyée avec succès pour {Email}", email);
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Erreur lors de l'envoi de la notification Expo pour {Email}", email);
                            // Ne pas bloquer la transaction si l'envoi de notification échoue
                        }
                    }

                    // 3. Continuer avec la mise à jour PostgreSQL
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

                        // Après la mise à jour du solde dans Postgres, récupérer le nouveau solde et l'email
                        var getNewBalanceQuery = @"
                            SELECT p.solde, u.email
                            FROM portefeuille p
                            JOIN Utilisateur u ON p.id_utilisateur = u.id_utilisateur
                            WHERE p.id_portefeuille = @portefeuilleId";

                        using var cmdNewBalance = new NpgsqlCommand(getNewBalanceQuery, connection);
                        cmdNewBalance.Parameters.AddWithValue("@portefeuilleId", portefeuilleId);
                        using var balanceReader = await cmdNewBalance.ExecuteReaderAsync();

                        if (await balanceReader.ReadAsync())
                        {
                            var newBalance = balanceReader.GetDecimal(0);
                            var userEmail = balanceReader.GetString(1);

                            // D'abord, chercher le document Firebase avec le même email
                            var searchUrl2 = $"{_firebaseSettings.FirestoreUrl}/portefeuilles?key={_firebaseSettings.ApiKey}";
                            var searchResponses = await _httpClient.GetAsync(searchUrl2);

                            if (searchResponses.IsSuccessStatusCode)
                            {
                                var content = await searchResponses.Content.ReadAsStringAsync();
                                var firebaseData = JsonSerializer.Deserialize<JsonElement>(content);
                                string? firebaseDocumentId = null;

                                if (firebaseData.TryGetProperty("documents", out JsonElement documents))
                                {
                                    foreach (var doc in documents.EnumerateArray())
                                    {
                                        var fields = doc.GetProperty("fields");
                                        if (fields.TryGetProperty("email", out JsonElement emailField) &&
                                            emailField.GetProperty("stringValue").GetString() == userEmail)
                                        {
                                            // Extraire l'ID du document depuis son nom
                                            var documentPath = doc.GetProperty("name").GetString();
                                            firebaseDocumentId = documentPath.Split("/").Last();
                                            break;
                                        }
                                    }
                                }

                                if (firebaseDocumentId != null)
                                {
                                    // Mettre à jour le solde dans Firebase avec l'ID trouvé
                                    var walletUpdateUrl = $"{_firebaseSettings.FirestoreUrl}/portefeuilles/{firebaseDocumentId}?key={_firebaseSettings.ApiKey}";

                                    var walletUpdateData = new
                                    {
                                        fields = new
                                        {
                                            userId = new { stringValue = firebaseDocumentId },
                                            email = new { stringValue = userEmail },
                                            solde = new { doubleValue = (double)newBalance },
                                            transactions = new { arrayValue = new { values = new object[] { } } },
                                            createdAt = new { timestampValue = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ") }
                                        }
                                    };

                                    var walletUpdateContent = new StringContent(
                                        JsonSerializer.Serialize(walletUpdateData),
                                        Encoding.UTF8,
                                        "application/json"
                                    );

                                    var walletUpdateResponse = await _httpClient.PatchAsync(walletUpdateUrl, walletUpdateContent);

                                    if (!walletUpdateResponse.IsSuccessStatusCode)
                                    {
                                        var errorContent = await walletUpdateResponse.Content.ReadAsStringAsync();
                                        _logger.LogError("Échec de la mise à jour du solde Firebase. Status: {Status}, Error: {Error}",
                                            walletUpdateResponse.StatusCode, errorContent);
                                        await transaction.RollbackAsync();
                                        return StatusCode(500, new { message = "Erreur lors de la mise à jour du solde dans Firebase" });
                                    }
                                }
                                else
                                {
                                    _logger.LogError("Aucun document Firebase trouvé pour l'email: {Email}", userEmail);
                                    await transaction.RollbackAsync();
                                    return StatusCode(500, new { message = "Portefeuille Firebase non trouvé" });
                                }
                            }
                        }
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

        [HttpPost("fcm-token")]
        public async Task<IActionResult> UpdateFcmToken([FromBody] FcmTokenRequest request)
        {
            try
            {
                // Récupérer l'email de l'utilisateur depuis le token d'authentification
                var token = Request.Headers["Authorization"].FirstOrDefault()?.Split(" ").Last();
                if (string.IsNullOrEmpty(token))
                {
                    return Unauthorized(new { message = "No token provided" });
                }

                using var connection = GetConnection();
                await connection.OpenAsync();

                // Mettre à jour le token FCM dans la table Utilisateur
                var updateQuery = @"
                    UPDATE Utilisateur 
                    SET fcm_token = @fcmToken
                    WHERE email = @email
                    RETURNING id_utilisateur";

                using var command = new NpgsqlCommand(updateQuery, connection);
                command.Parameters.AddWithValue("@fcmToken", request.Token);
                command.Parameters.AddWithValue("@email", request.Email);

                var userId = await command.ExecuteScalarAsync();

                if (userId == null)
                {
                    return NotFound(new { message = "User not found" });
                }

                return Ok(new { message = "FCM token updated successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating FCM token");
                return StatusCode(500, new { message = "Error updating FCM token" });
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

    public class FcmTokenRequest
    {
        public string Token { get; set; }
        public string Email { get; set; }
    }
}