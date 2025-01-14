using System;
using System.Data;
using System.Dynamic;
using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace Cryptomonnaie.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DatabaseController : ControllerBase
{
    private readonly string _connectionString;

    public DatabaseController()
    {
        // Chaîne de connexion mise à jour pour PostgreSQL
        _connectionString = "Host=localhost;Port=5433;Database=identity_db;Username=postgres;Password=postgres_password";
    }

    [HttpGet("test-connection")]
    public IActionResult TestConnection()
    {
        try
        {
            using (var connection = new NpgsqlConnection(_connectionString))
            {
                connection.Open();
                return Ok("Connexion réussie à la base de données PostgreSQL.");
            }
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Erreur lors de la connexion à la base de données : {ex.Message}");
        }
    }

    [HttpGet("data")]
    public IActionResult GetData()
    {
        try
        {
            using (var connection = new NpgsqlConnection(_connectionString))
            {
                connection.Open();

                string query = "SELECT * FROM my_table";
                using (var command = new NpgsqlCommand(query, connection))
                {
                    using (var reader = command.ExecuteReader())
                    {
                        var result = new List<object>();

                        while (reader.Read())
                        {
                            var row = new ExpandoObject() as IDictionary<string, object>;
                            for (int i = 0; i < reader.FieldCount; i++)
                            {
                                row.Add(reader.GetName(i), reader.GetValue(i));
                            }
                            result.Add(row);
                        }

                        return Ok(result);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Erreur lors de la récupération des données : {ex.Message}");
        }
    }
}