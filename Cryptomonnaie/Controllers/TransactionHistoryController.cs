using Microsoft.AspNetCore.Mvc;
using Npgsql;
using Cryptomonnaie.Models;

namespace Cryptomonnaie.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TransactionHistoryController : ControllerBase
    {
        private readonly string _connectionString;
        private readonly ILogger<TransactionHistoryController> _logger;

        public TransactionHistoryController(ILogger<TransactionHistoryController> logger)
        {
            _connectionString = "Server=postgres;Port=5432;Database=identity_db;User Id=postgres;Password=postgres_password;";
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetTransactions([FromQuery] TransactionFilter filter)
        {
            try
            {
                using var connection = new NpgsqlConnection(_connectionString);
                await connection.OpenAsync();

                var whereClause = new List<string>();
                var parameters = new List<NpgsqlParameter>();

                if (!string.IsNullOrEmpty(filter.Type))
                {
                    whereClause.Add("t.type = @type");
                    parameters.Add(new NpgsqlParameter("@type", filter.Type));
                }

                if (filter.UserId.HasValue)
                {
                    whereClause.Add("u.id_utilisateur = @userId");
                    parameters.Add(new NpgsqlParameter("@userId", filter.UserId.Value));
                }

                if (filter.StartDate.HasValue)
                {
                    whereClause.Add("t.date_transaction >= @startDate");
                    parameters.Add(new NpgsqlParameter("@startDate", filter.StartDate.Value));
                }

                if (filter.EndDate.HasValue)
                {
                    whereClause.Add("t.date_transaction <= @endDate");
                    parameters.Add(new NpgsqlParameter("@endDate", filter.EndDate.Value));
                }

                if (filter.CryptoId.HasValue)
                {
                    whereClause.Add("c.id_crypto = @cryptoId");
                    parameters.Add(new NpgsqlParameter("@cryptoId", filter.CryptoId.Value));
                }

                var orderClause = "t.date_transaction DESC";

                if (!string.IsNullOrEmpty(filter.SortBy))
                {
                    var sortField = filter.SortBy.ToLower() switch
                    {
                        "date" => "t.date_transaction",
                        "type" => "t.type",
                        "username" => "u.username",
                        "montant" => "t.prix_unitaire * COALESCE(t.quantiteEntree, t.quantiteSortie)",
                        _ => "t.date_transaction"
                    };

                    var sortOrder = filter.SortOrder?.ToUpper() == "ASC" ? "ASC" : "DESC";
                    orderClause = $"{sortField} {sortOrder}";
                }

                var whereStatement = whereClause.Count > 0 
                    ? "WHERE " + string.Join(" AND ", whereClause)
                    : "";

                var query = $@"
                    WITH filtered_transactions AS (
                        SELECT 
                            t.id_transaction,
                            t.type,
                            COALESCE(t.quantiteEntree, 0) as quantite_entree,
                            COALESCE(t.quantiteSortie, 0) as quantite_sortie,
                            t.prix_unitaire,
                            t.date_transaction,
                            u.username,
                            u.id_utilisateur,
                            c.nom_crypto,
                            c.id_crypto
                        FROM Transaction t
                        JOIN portefeuille_crypto pc ON t.id_portefeuille_crypto = pc.id_portefeuille_crypto
                        JOIN portefeuille p ON pc.id_portefeuille = p.id_portefeuille
                        JOIN Utilisateur u ON p.id_utilisateur = u.id_utilisateur
                        JOIN Crypto c ON pc.id_crypto = c.id_crypto
                        {whereStatement}
                        ORDER BY {orderClause}
                    )
                    SELECT 
                        *,
                        COUNT(*) OVER() as total_count
                    FROM filtered_transactions
                    LIMIT @pageSize
                    OFFSET @offset";

                using var cmd = new NpgsqlCommand(query, connection);
                
                foreach (var param in parameters)
                {
                    cmd.Parameters.Add(param);
                }

                cmd.Parameters.AddWithValue("@pageSize", filter.PageSize);
                cmd.Parameters.AddWithValue("@offset", (filter.Page - 1) * filter.PageSize);

                var transactions = new List<object>();
                var totalCount = 0;

                using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    totalCount = reader.GetInt32(reader.GetOrdinal("total_count"));
                    transactions.Add(new
                    {
                        id = reader.GetInt32(reader.GetOrdinal("id_transaction")),
                        type = reader.GetString(reader.GetOrdinal("type")),
                        quantite = reader.GetString(reader.GetOrdinal("type")) == "BUY" 
                            ? reader.GetDecimal(reader.GetOrdinal("quantite_entree"))
                            : reader.GetDecimal(reader.GetOrdinal("quantite_sortie")),
                        prix_unitaire = reader.GetDecimal(reader.GetOrdinal("prix_unitaire")),
                        date = reader.GetDateTime(reader.GetOrdinal("date_transaction")),
                        username = reader.GetString(reader.GetOrdinal("username")),
                        user_id = reader.GetInt32(reader.GetOrdinal("id_utilisateur")),
                        crypto = reader.GetString(reader.GetOrdinal("nom_crypto")),
                        montant_total = reader.GetDecimal(reader.GetOrdinal("prix_unitaire")) * 
                            (reader.GetString(reader.GetOrdinal("type")) == "BUY" 
                                ? reader.GetDecimal(reader.GetOrdinal("quantite_entree"))
                                : reader.GetDecimal(reader.GetOrdinal("quantite_sortie")))
                    });
                }

                return Ok(new
                {
                    transactions,
                    totalCount,
                    totalPages = (int)Math.Ceiling(totalCount / (double)filter.PageSize),
                    currentPage = filter.Page
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la récupération des transactions: {Message}", ex.Message);
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }
} 