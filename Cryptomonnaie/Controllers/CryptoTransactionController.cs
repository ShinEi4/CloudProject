using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace Cryptomonnaie.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CryptoTransactionController : ControllerBase
    {
        private readonly string _connectionString;
        private readonly ILogger<CryptoTransactionController> _logger;

        public CryptoTransactionController(ILogger<CryptoTransactionController> logger)
        {
            _connectionString = "Server=postgres;Port=5432;Database=identity_db;User Id=postgres;Password=postgres_password;";
            _logger = logger;
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

                using var cmd = new NpgsqlCommand(query, connection);
                cmd.Parameters.AddWithValue("@userId", userId);

                var portfolio = new List<object>();
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
            try
            {
                using var connection = new NpgsqlConnection(_connectionString);
                await connection.OpenAsync();
                await using var transaction = await connection.BeginTransactionAsync();

                try
                {
                    // 1. Vérifier le solde et obtenir l'ID du portefeuille
                    var checkBalanceQuery = @"
                        SELECT id_portefeuille, solde 
                        FROM portefeuille 
                        WHERE id_utilisateur = @userId
                        FOR UPDATE";

                    using var balanceCmd = new NpgsqlCommand(checkBalanceQuery, connection);
                    balanceCmd.Parameters.AddWithValue("@userId", request.UserId);
                    using var reader = await balanceCmd.ExecuteReaderAsync();

                    if (!await reader.ReadAsync())
                    {
                        return BadRequest(new { message = "Portefeuille non trouvé pour cet utilisateur" });
                    }

                    var walletId = reader.GetInt32(0);
                    var currentBalance = reader.GetDecimal(1);
                    await reader.CloseAsync();

                    // 2. Calculer le coût total
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

                    var price = (decimal)priceResult;
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

                    await transaction.CommitAsync();

                    // Vérifier le nouveau solde
                    var finalBalanceQuery = "SELECT solde FROM portefeuille WHERE id_portefeuille = @walletId";
                    using var finalCmd = new NpgsqlCommand(finalBalanceQuery, connection);
                    finalCmd.Parameters.AddWithValue("@walletId", walletId);
                    var finalBalance = (decimal)await finalCmd.ExecuteScalarAsync();

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
            try
            {
                using var connection = new NpgsqlConnection(_connectionString);
                await connection.OpenAsync();
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
                        )
                        SELECT 
                            p.id_portefeuille, 
                            p.solde, 
                            COALESCE(pc.montant, 0) as montant, 
                            COALESCE(pc.id_portefeuille_crypto, 0) as id_portefeuille_crypto
                        FROM portefeuille_info p
                        LEFT JOIN portefeuille_crypto pc ON p.id_portefeuille = pc.id_portefeuille 
                            AND pc.id_crypto = @cryptoId";

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
                    var cryptoBalance = !reader.IsDBNull(2) ? reader.GetDecimal(2) : 0;
                    var portfolioCryptoId = !reader.IsDBNull(3) ? reader.GetInt32(3) : 0;
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

                    var price = (decimal)priceResult;
                    var totalAmount = price * request.Quantite;

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

                    await transaction.CommitAsync();

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
    }

    public class CryptoTransactionRequest
    {
        public int UserId { get; set; }
        public int CryptoId { get; set; }
        public decimal Quantite { get; set; }
    }
} 