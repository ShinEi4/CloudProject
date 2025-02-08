using Microsoft.AspNetCore.Mvc;
using Npgsql;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Text;
using System.Text.Json;
using System.Net.Http;
using Cryptomonnaie.Config;
using System.ComponentModel.DataAnnotations;
using System.Threading;
using System.Linq;
using System.Collections.Generic;
using System.Web;

namespace Cryptomonnaie.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CryptoTransactionController : ControllerBase
    {
        private readonly string _connectionString;
        private readonly ILogger<CryptoTransactionController> _logger;
        private readonly FirebaseSettings _firebaseSettings;
        private readonly HttpClient _httpClient;

        public CryptoTransactionController(
            ILogger<CryptoTransactionController> logger,
            IOptions<FirebaseSettings> firebaseSettings,
            HttpClient httpClient)
        {
            _connectionString = "Server=postgres;Port=5432;Database=identity_db;User Id=postgres;Password=postgres_password;";
            _logger = logger;
            _firebaseSettings = firebaseSettings.Value;
            _httpClient = httpClient;
        }

        [HttpGet("portfolio/{userId}")]
        public async Task<IActionResult> GetUserPortfolio(int userId)
        {
            try
            {
                using var connection = new NpgsqlConnection(_connectionString);
                await connection.OpenAsync();

                var query = @"
                    SELECT 
                        c.nom_crypto,
                        pc.montant,
                        COALESCE(
                            (SELECT prix FROM prix_crypto 
                             WHERE id_crypto = c.id_crypto 
                             ORDER BY date_prix DESC LIMIT 1), 0
                        ) as prix_actuel
                    FROM portefeuille p
                    JOIN portefeuille_crypto pc ON p.id_portefeuille = pc.id_portefeuille
                    JOIN crypto c ON pc.id_crypto = c.id_crypto
                    WHERE p.id_utilisateur = @userId";

                var portfolio = new List<object>();
                
                // Utiliser using pour assurer la fermeture du reader
                using (var cmd = new NpgsqlCommand(query, connection))
                {
                    cmd.Parameters.AddWithValue("@userId", userId);
                    using var reader = await cmd.ExecuteReaderAsync();
                    
                    while (await reader.ReadAsync())
                    {
                        portfolio.Add(new
                        {
                            crypto = reader.GetString(0),
                            montant = reader.GetDecimal(1),
                            prix_actuel = reader.GetDecimal(2),
                            valeur_totale = reader.GetDecimal(1) * reader.GetDecimal(2)
                        });
                    }
                    await reader.CloseAsync();
                }

                return Ok(portfolio);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching portfolio for user {UserId}", userId);
                return StatusCode(500, "Error fetching portfolio");
            }
        }

        [HttpPost("buy")]
        public async Task<IActionResult> BuyCrypto([FromBody] CryptoTransactionRequest request)
        {
            if (request.Quantite <= 0)
            {
                return BadRequest(new { message = "La quantité doit être supérieure à 0" });
            }

            try
            {
                using var connection = new NpgsqlConnection(_connectionString);
                await connection.OpenAsync();

                // Récupérer l'email de l'utilisateur
                var getUserEmailQuery = "SELECT email FROM utilisateur WHERE id_utilisateur = @userId";
                using var emailCmd = new NpgsqlCommand(getUserEmailQuery, connection);
                emailCmd.Parameters.AddWithValue("@userId", request.UserId);
                var userEmail = (string)await emailCmd.ExecuteScalarAsync();

                if (string.IsNullOrEmpty(userEmail))
                {
                    return BadRequest(new { message = "Email utilisateur non trouvé" });
                }

                await using var transaction = await connection.BeginTransactionAsync();

                try
                {
                    // 1. Vérifier le solde et obtenir l'ID du portefeuille
                    var checkBalanceQuery = @"
                        WITH wallet_info AS (
                            SELECT id_portefeuille, solde 
                            FROM portefeuille 
                            WHERE id_utilisateur = @userId
                            FOR UPDATE
                        ),
                        crypto_info AS (
                            SELECT nom_crypto, prix 
                            FROM crypto c
                            JOIN prix_crypto pc ON c.id_crypto = pc.id_crypto
                            WHERE c.id_crypto = @cryptoId
                            ORDER BY pc.date_prix DESC 
                            LIMIT 1
                        )
                        SELECT 
                            w.id_portefeuille,
                            w.solde,
                            c.nom_crypto,
                            c.prix
                        FROM wallet_info w
                        CROSS JOIN crypto_info c";

                    using var balanceCmd = new NpgsqlCommand(checkBalanceQuery, connection);
                    balanceCmd.Parameters.AddWithValue("@userId", request.UserId);
                    balanceCmd.Parameters.AddWithValue("@cryptoId", request.CryptoId);
                    using var reader = await balanceCmd.ExecuteReaderAsync();

                    if (!await reader.ReadAsync())
                    {
                        return BadRequest(new { message = "Portefeuille non trouvé pour cet utilisateur" });
                    }

                    var walletId = reader.GetInt32(0);
                    var currentBalance = reader.GetDecimal(1);
                    var cryptoName = reader.GetString(2);
                    var price = reader.GetDecimal(3);

                    // Fermer le reader avant d'exécuter d'autres commandes
                    await reader.CloseAsync();

                    // 2. Calculer le coût total
                    var totalCost = price * request.Quantite;

                    _logger.LogInformation($"Tentative d'achat - Solde actuel: {currentBalance}, Coût total: {totalCost}");

                    if (currentBalance < totalCost)
                    {
                        return BadRequest(new { 
                            message = "Solde insuffisant",
                            details = new {
                                solde_actuel = currentBalance,
                                cout_achat = totalCost,
                                manquant = totalCost - currentBalance
                            }
                        });
                    }

                    // 3. Mettre à jour le solde - SIMPLIFIÉ
                    var updateBalanceQuery = @"
                        UPDATE portefeuille 
                        SET solde = solde - @amount 
                        WHERE id_portefeuille = @walletId";

                    using var updateCmd = new NpgsqlCommand(updateBalanceQuery, connection);
                    updateCmd.Parameters.AddWithValue("@amount", totalCost);
                    updateCmd.Parameters.AddWithValue("@walletId", walletId);
                    await updateCmd.ExecuteNonQueryAsync();

                    // 4. Mettre à jour le portefeuille crypto
                    var updateCryptoQuery = @"
                        INSERT INTO portefeuille_crypto (id_portefeuille, id_crypto, montant)
                        VALUES (@walletId, @cryptoId, @amount)
                        ON CONFLICT (id_portefeuille, id_crypto)
                        DO UPDATE SET montant = portefeuille_crypto.montant + @amount
                        RETURNING id_portefeuille_crypto";

                    using var cryptoCmd = new NpgsqlCommand(updateCryptoQuery, connection);
                    cryptoCmd.Parameters.AddWithValue("@walletId", walletId);
                    cryptoCmd.Parameters.AddWithValue("@cryptoId", request.CryptoId);
                    cryptoCmd.Parameters.AddWithValue("@amount", request.Quantite);
                    var portfolioId = await cryptoCmd.ExecuteScalarAsync();

                    // 5. Créer la transaction
                    var createTransactionQuery = @"
                        INSERT INTO Transaction (
                            type, quantiteEntree, prix_unitaire, 
                            date_transaction, is_validate, 
                            id_portefeuille_crypto
                        ) VALUES (
                            'BUY', @quantite, @prix, 
                            NOW(), true, 
                            @portfolioId
                        )";

                    using var transactionCmd = new NpgsqlCommand(createTransactionQuery, connection);
                    transactionCmd.Parameters.AddWithValue("@quantite", request.Quantite);
                    transactionCmd.Parameters.AddWithValue("@prix", price);
                    transactionCmd.Parameters.AddWithValue("@portfolioId", portfolioId);
                    await transactionCmd.ExecuteNonQueryAsync();

                    // Vérifier le nouveau solde
                    var finalBalanceQuery = "SELECT solde FROM portefeuille WHERE id_portefeuille = @walletId";
                    using var finalCmd = new NpgsqlCommand(finalBalanceQuery, connection);
                    finalCmd.Parameters.AddWithValue("@walletId", walletId);
                    var finalBalance = (decimal)await finalCmd.ExecuteScalarAsync();

                    // Mettre à jour Firebase avant le commit
                    await UpdateFirebaseBalance(userEmail, finalBalance);

                    await transaction.CommitAsync();

                    await SaveTransactionToFirebase("BUY", userEmail, cryptoName, request.Quantite, price, totalCost);

                    return Ok(new { 
                        message = "Achat réussi",
                        cout = totalCost,
                        ancien_solde = currentBalance,
                        nouveau_solde = finalBalance
                    });
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    _logger.LogError(ex, "Erreur détaillée lors de l'achat: {Message}", ex.Message);
                    return StatusCode(500, new { 
                        message = "Erreur lors de l'achat",
                        details = ex.Message,
                        stackTrace = ex.StackTrace // En développement uniquement
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors du traitement de l'achat: {Message}", ex.Message);
                return StatusCode(500, new { 
                    message = "Erreur lors du traitement de l'achat",
                    details = ex.Message
                });
            }
        }

        [HttpPost("sell")]
        public async Task<IActionResult> SellCrypto([FromBody] CryptoTransactionRequest request)
        {
            if (request.Quantite <= 0)
            {
                return BadRequest(new { message = "La quantité doit être supérieure à 0" });
            }

            try
            {
                using var connection = new NpgsqlConnection(_connectionString);
                await connection.OpenAsync();

                // Récupérer l'email de l'utilisateur
                var getUserEmailQuery = "SELECT email FROM utilisateur WHERE id_utilisateur = @userId";
                using var emailCmd = new NpgsqlCommand(getUserEmailQuery, connection);
                emailCmd.Parameters.AddWithValue("@userId", request.UserId);
                var userEmail = (string)await emailCmd.ExecuteScalarAsync();

                if (string.IsNullOrEmpty(userEmail))
                {
                    return BadRequest(new { message = "Email utilisateur non trouvé" });
                }

                await using var transaction = await connection.BeginTransactionAsync();

                try
                {
                    // 1. Vérifier le solde et obtenir l'ID du portefeuille
                    var checkBalanceQuery = @"
                        WITH portefeuille_info AS (
                            SELECT id_portefeuille, solde 
                            FROM portefeuille 
                            WHERE id_utilisateur = @userId
                            FOR UPDATE
                        ),
                        crypto_info AS (
                            SELECT c.nom_crypto, pc.prix,
                                   COALESCE(pfc.montant, 0) as montant,
                                   COALESCE(pfc.id_portefeuille_crypto, 0) as id_portefeuille_crypto
                            FROM crypto c
                            JOIN prix_crypto pc ON c.id_crypto = pc.id_crypto
                            LEFT JOIN portefeuille_crypto pfc ON c.id_crypto = pfc.id_crypto
                            WHERE c.id_crypto = @cryptoId
                            ORDER BY pc.date_prix DESC 
                            LIMIT 1
                        )
                        SELECT 
                            p.id_portefeuille,
                            p.solde,
                            c.nom_crypto,
                            c.prix,
                            c.montant,
                            c.id_portefeuille_crypto
                        FROM portefeuille_info p
                        CROSS JOIN crypto_info c";

                    using var balanceCmd = new NpgsqlCommand(checkBalanceQuery, connection);
                    balanceCmd.Parameters.AddWithValue("@userId", request.UserId);
                    balanceCmd.Parameters.AddWithValue("@cryptoId", request.CryptoId);
                    using var reader = await balanceCmd.ExecuteReaderAsync();

                    if (!await reader.ReadAsync())
                    {
                        return BadRequest(new { message = "Portefeuille non trouvé pour cet utilisateur" });
                    }

                    var walletId = reader.GetInt32(0);
                    var currentBalance = reader.GetDecimal(1);
                    var cryptoName = reader.GetString(2);
                    var price = reader.GetDecimal(3);
                    var cryptoBalance = !reader.IsDBNull(4) ? reader.GetDecimal(4) : 0;
                    var portfolioCryptoId = !reader.IsDBNull(5) ? reader.GetInt32(5) : 0;
                    await reader.CloseAsync();

                    // 2. Vérifier si l'utilisateur possède la crypto
                    if (portfolioCryptoId == 0)
                    {
                        return BadRequest(new { 
                            message = "Vous ne possédez pas cette cryptomonnaie",
                            details = new {
                                crypto_id = request.CryptoId,
                                solde_actuel = 0
                            }
                        });
                    }

                    _logger.LogInformation($"Tentative de vente - Solde crypto actuel: {cryptoBalance}, Quantité demandée: {request.Quantite}");

                    // 3. Vérifier si l'utilisateur a assez de crypto
                    if (cryptoBalance < request.Quantite)
                    {
                        return BadRequest(new { 
                            message = "Quantité insuffisante de crypto",
                            details = new {
                                solde_actuel_crypto = cryptoBalance,
                                quantite_demandee = request.Quantite,
                                manquant = request.Quantite - cryptoBalance
                            }
                        });
                    }

                    // 4. Obtenir le prix actuel
                    var getPriceQuery = @"
                        SELECT prix FROM prix_crypto 
                        WHERE id_crypto = @cryptoId 
                        ORDER BY date_prix DESC LIMIT 1";

                    using var priceCmd = new NpgsqlCommand(getPriceQuery, connection);
                    priceCmd.Parameters.AddWithValue("@cryptoId", request.CryptoId);
                    var priceResult = await priceCmd.ExecuteScalarAsync();

                    if (priceResult == null)
                    {
                        return BadRequest(new { message = $"Prix non trouvé pour la crypto ID: {request.CryptoId}" });
                    }

                    var price2 = (decimal)priceResult;
                    var totalAmount = price2 * request.Quantite;

                    // 5. Mettre à jour le portefeuille crypto
                    var updateCryptoQuery = @"
                        UPDATE portefeuille_crypto 
                        SET montant = montant - @quantite
                        WHERE id_portefeuille_crypto = @portfolioCryptoId
                        RETURNING montant";

                    using var cryptoCmd = new NpgsqlCommand(updateCryptoQuery, connection);
                    cryptoCmd.Parameters.AddWithValue("@quantite", request.Quantite);
                    cryptoCmd.Parameters.AddWithValue("@portfolioCryptoId", portfolioCryptoId);
                    var newCryptoBalance = await cryptoCmd.ExecuteScalarAsync();

                    // 6. Mettre à jour le solde du portefeuille
                    var updateBalanceQuery = @"
                        UPDATE portefeuille 
                        SET solde = solde + @amount
                        WHERE id_portefeuille = @walletId
                        RETURNING solde";

                    using var updateCmd = new NpgsqlCommand(updateBalanceQuery, connection);
                    updateCmd.Parameters.AddWithValue("@amount", totalAmount);
                    updateCmd.Parameters.AddWithValue("@walletId", walletId);
                    var newBalance = await updateCmd.ExecuteScalarAsync();

                    // 7. Créer la transaction
                    var createTransactionQuery = @"
                        INSERT INTO Transaction (
                            type, quantiteSortie, prix_unitaire, 
                            date_transaction, is_validate, 
                            id_portefeuille_crypto
                        ) VALUES (
                            'SELL', @quantite, @prix, 
                            NOW(), true, 
                            @portfolioCryptoId
                        )";

                    using var transactionCmd = new NpgsqlCommand(createTransactionQuery, connection);
                    transactionCmd.Parameters.AddWithValue("@quantite", request.Quantite);
                    transactionCmd.Parameters.AddWithValue("@prix", price);
                    transactionCmd.Parameters.AddWithValue("@portfolioCryptoId", portfolioCryptoId);
                    await transactionCmd.ExecuteNonQueryAsync();

                    // Mettre à jour Firebase avant le commit
                    await UpdateFirebaseBalance(userEmail, (decimal)newBalance);

                    await transaction.CommitAsync();

                    await SaveTransactionToFirebase("SELL", userEmail, cryptoName, request.Quantite, price, totalAmount);

                    if (newCryptoBalance == null)
                    {
                        await transaction.RollbackAsync();
                        return StatusCode(500, new { message = "Erreur lors de la mise à jour du solde crypto" });
                    }

                    if (newBalance == null)
                    {
                        await transaction.RollbackAsync();
                        return StatusCode(500, new { message = "Erreur lors de la mise à jour du solde" });
                    }

                    return Ok(new { 
                        message = "Vente réussie",
                        cout = totalAmount,
                        ancien_solde = currentBalance,
                        nouveau_solde = newBalance,
                        ancien_solde_crypto = cryptoBalance,
                        nouveau_solde_crypto = newCryptoBalance
                    });
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    _logger.LogError(ex, "Erreur détaillée lors de la vente: {Message}", ex.Message);
                    return StatusCode(500, new { 
                        message = "Erreur lors de la vente",
                        details = ex.Message,
                        stackTrace = ex.StackTrace
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors du traitement de la vente: {Message}", ex.Message);
                return StatusCode(500, new { 
                    message = "Erreur lors du traitement de la vente",
                    details = ex.Message
                });
            }
        }

        private async Task SaveTransactionToFirebase(string type, string userEmail, string cryptoName, decimal quantite, decimal prix, decimal montantTotal)
        {
            try
            {
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
                
                var collection = type == "BUY" ? "achatCrypto" : "venteCrypto";
                var url = $"{_firebaseSettings.FirestoreUrl}/{collection}?key={_firebaseSettings.ApiKey}";

                var document = new
                {
                    fields = new
                    {
                        email = new { stringValue = userEmail },
                        cryptoName = new { stringValue = cryptoName },
                        quantite = new { doubleValue = (double)quantite },
                        prix = new { doubleValue = (double)prix },
                        montantTotal = new { doubleValue = (double)montantTotal },
                        date = new { timestampValue = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ") }
                    }
                };

                var content = new StringContent(
                    JsonSerializer.Serialize(document),
                    Encoding.UTF8,
                    "application/json"
                );

                var response = await _httpClient.PostAsync(url, content, cts.Token);
                
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Échec de l'enregistrement dans Firebase. Status: {Status}, Response: {Response}", 
                        response.StatusCode, 
                        await response.Content.ReadAsStringAsync());
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de l'enregistrement dans Firebase");
            }
        }

        private async Task UpdateFirebaseBalance(string userEmail, decimal newBalance)
        {
            try
            {
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));

                // D'abord, chercher le document Firebase avec le même email
                var searchUrl = $"{_firebaseSettings.FirestoreUrl}/portefeuilles?key={_firebaseSettings.ApiKey}";
                var searchResponse = await _httpClient.GetAsync(searchUrl);
                
                if (searchResponse.IsSuccessStatusCode)
                {
                    var content = await searchResponse.Content.ReadAsStringAsync();
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
                        }
                        else
                        {
                            _logger.LogInformation("Mise à jour Firebase réussie pour {Email}, nouveau solde: {Balance}", 
                                userEmail, newBalance);
                        }
                    }
                    else
                    {
                        _logger.LogError("Aucun document Firebase trouvé pour l'email: {Email}", userEmail);
                    }
                }
                else
                {
                    _logger.LogError("Échec de la recherche Firebase. Status: {Status}", searchResponse.StatusCode);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la mise à jour du solde Firebase pour {Email}", userEmail);
            }
        }
    }

    public class CryptoTransactionRequest
    {
        public int UserId { get; set; }
        public int CryptoId { get; set; }
        [Range(0.000001, double.MaxValue, ErrorMessage = "La quantité doit être supérieure à 0")]
        public decimal Quantite { get; set; }
    }
} 