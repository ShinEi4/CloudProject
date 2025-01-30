using Microsoft.AspNetCore.Mvc;
using Npgsql;
using Cryptomonnaie.Models;

namespace Cryptomonnaie.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CommissionController : ControllerBase
    {
        private readonly string _connectionString;
        private readonly ILogger<CommissionController> _logger;

        public CommissionController(ILogger<CommissionController> logger)
        {
            _connectionString = "Server=postgres;Port=5432;Database=identity_db;User Id=postgres;Password=postgres_password;";
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetCommissions()
        {
            try
            {
                using var connection = new NpgsqlConnection(_connectionString);
                await connection.OpenAsync();

                // On récupère les dernières commissions pour chaque type
                var query = @"
                    WITH LastCommissions AS (
                        SELECT 
                            id_commission,
                            type,
                            pourcentage,
                            date_modification,
                            ROW_NUMBER() OVER (PARTITION BY type ORDER BY date_modification DESC) as rn
                        FROM Commission
                    )
                    SELECT 
                        id_commission,
                        type,
                        pourcentage,
                        date_modification
                    FROM LastCommissions
                    WHERE rn = 1
                    ORDER BY type";

                using var cmd = new NpgsqlCommand(query, connection);
                var commissions = new List<Commission>();

                using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    commissions.Add(new Commission
                    {
                        Id = reader.GetInt32(0),
                        Type = reader.GetString(1),
                        Pourcentage = reader.GetDecimal(2),
                        DateModification = reader.GetDateTime(3)
                    });
                }

                return Ok(commissions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la récupération des commissions");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("historique")]
        public async Task<IActionResult> GetHistoriqueCommissions([FromQuery] string? type = null)
        {
            try
            {
                using var connection = new NpgsqlConnection(_connectionString);
                await connection.OpenAsync();

                var whereClause = type != null ? "WHERE type = @type" : "";
                var query = $@"
                    SELECT 
                        id_commission,
                        type,
                        pourcentage,
                        date_modification
                    FROM Commission
                    {whereClause}
                    ORDER BY date_modification DESC";

                using var cmd = new NpgsqlCommand(query, connection);
                if (type != null)
                {
                    cmd.Parameters.AddWithValue("@type", type);
                }

                var commissions = new List<Commission>();

                using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    commissions.Add(new Commission
                    {
                        Id = reader.GetInt32(0),
                        Type = reader.GetString(1),
                        Pourcentage = reader.GetDecimal(2),
                        DateModification = reader.GetDateTime(3)
                    });
                }

                return Ok(commissions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la récupération de l'historique des commissions");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> AddCommission([FromBody] CommissionUpdateRequest request)
        {
            try
            {
                if (request.Pourcentage < 0 || request.Pourcentage > 100)
                {
                    return BadRequest(new { message = "Le pourcentage doit être entre 0 et 100" });
                }

                using var connection = new NpgsqlConnection(_connectionString);
                await connection.OpenAsync();

                // Insérer la nouvelle commission
                var insertQuery = @"
                    INSERT INTO Commission (type, pourcentage, date_modification)
                    VALUES (@type, @pourcentage, CURRENT_TIMESTAMP)
                    RETURNING id_commission, type, pourcentage, date_modification";

                using var insertCmd = new NpgsqlCommand(insertQuery, connection);
                insertCmd.Parameters.AddWithValue("@type", request.Type);
                insertCmd.Parameters.AddWithValue("@pourcentage", request.Pourcentage);

                using var reader = await insertCmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    var commission = new Commission
                    {
                        Id = reader.GetInt32(0),
                        Type = reader.GetString(1),
                        Pourcentage = reader.GetDecimal(2),
                        DateModification = reader.GetDateTime(3)
                    };
                    return Ok(commission);
                }

                return StatusCode(500, new { message = "Erreur lors de l'insertion de la commission" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de l'ajout de la commission");
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }
} 