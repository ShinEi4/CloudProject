using System;
using System.Threading;
using System.Threading.Tasks;
using Npgsql;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Net.Http.Json;
using System.Text.Json;

namespace Cryptomonnaie.Services
{
    public class CryptoService : IHostedService, IDisposable
    {
        private Timer? _timer;
        private readonly string _connectionString;
        private readonly Random _random = new Random();
        private readonly ILogger<CryptoService> _logger;
        private readonly HttpClient _httpClient;
        private const string FirebaseProjectId = "cloud-project-bd903";
        private const string FirebaseApiKey = "AIzaSyBH8d8E09Pp4jPTsg18vDv1blm3ngtMgwU";

        public CryptoService(IConfiguration configuration, ILogger<CryptoService> logger, HttpClient httpClient)
        {
            _connectionString = "Server=postgres;Port=5432;Database=identity_db;User Id=postgres;Password=postgres_password;";
            _logger = logger;
            _httpClient = httpClient;
        }

        public async Task StartAsync(CancellationToken cancellationToken)
        {
            await InsertInitialPricesIntoFirebase();
            _timer = new Timer(GenerateNewPrices!, null, TimeSpan.FromSeconds(15), TimeSpan.FromSeconds(10));
            await Task.CompletedTask;
        }

        private async Task InsertInitialPricesIntoFirebase()
        {
            try
            {
                using var connection = new NpgsqlConnection(_connectionString);
                await connection.OpenAsync();

                var query = @"
                    SELECT c.id_crypto, c.nom_crypto, p.prix, p.date_prix
                    FROM Crypto c
                    JOIN prix_crypto p ON c.id_crypto = p.id_crypto
                    WHERE (c.id_crypto, p.date_prix) IN (
                        SELECT id_crypto, MIN(date_prix)
                        FROM prix_crypto
                        GROUP BY id_crypto
                    )
                    ORDER BY c.id_crypto";

                using var cmd = new NpgsqlCommand(query, connection);
                using var reader = await cmd.ExecuteReaderAsync();

                var initialPrices = new List<object>();
                while (await reader.ReadAsync())
                {
                    initialPrices.Add(new
                    {
                        crypto_id = reader.GetInt32(0),
                        nom_crypto = reader.GetString(1),
                        prix = reader.GetDecimal(2),
                        date = reader.GetDateTime(3).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                        variation_percent = 0.0
                    });
                }

                // Envoyer les prix initiaux à Firebase
                var baseUrl = $"https://firestore.googleapis.com/v1/projects/{FirebaseProjectId}/databases/(default)/documents";

                foreach (var price in initialPrices)
                {
                    var document = new
                    {
                        fields = new
                        {
                            crypto_id = new { integerValue = ((dynamic)price).crypto_id.ToString() },
                            nom_crypto = new { stringValue = ((dynamic)price).nom_crypto },
                            prix = new { doubleValue = (double)((dynamic)price).prix },
                            date = new { timestampValue = ((dynamic)price).date },
                            variation_percent = new { doubleValue = ((dynamic)price).variation_percent }
                        }
                    };

                    var response = await _httpClient.PostAsJsonAsync(
                        $"{baseUrl}/cours-crypto?key={FirebaseApiKey}",
                        document
                    );

                    if (!response.IsSuccessStatusCode)
                    {
                        var error = await response.Content.ReadAsStringAsync();
                        _logger.LogError($"Erreur Firebase lors de l'insertion initiale: {error}");
                    }
                    else
                    {
                        _logger.LogInformation($"Prix initial inséré pour {((dynamic)price).nom_crypto}");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de l'insertion des prix initiaux dans Firebase");
            }
        }

        private async void GenerateNewPrices(object? state)
        {
            try
            {
                using (var connection = new NpgsqlConnection(_connectionString))
                {
                    await connection.OpenAsync();

                    // Get initial prices for each crypto
                    var initialPricesQuery = @"
                        SELECT id_crypto, prix as initial_price
                        FROM prix_crypto
                        WHERE (id_crypto, date_prix) IN (
                            SELECT id_crypto, MIN(date_prix)
                            FROM prix_crypto
                            GROUP BY id_crypto
                        )";

                    var initialPrices = new Dictionary<int, decimal>();
                    using (var initCmd = new NpgsqlCommand(initialPricesQuery, connection))
                    using (var initReader = await initCmd.ExecuteReaderAsync())
                    {
                        while (await initReader.ReadAsync())
                        {
                            initialPrices[initReader.GetInt32(0)] = initReader.GetDecimal(1);
                        }
                    }

                    // Get latest prices
                    var query = @"
                        SELECT c.id_crypto, c.nom_crypto, 
                               COALESCE((SELECT prix FROM prix_crypto 
                                WHERE id_crypto = c.id_crypto 
                                ORDER BY date_prix DESC LIMIT 1), 100) as dernier_prix
                        FROM crypto c";

                    using var cmd = new NpgsqlCommand(query, connection);
                    using var reader = await cmd.ExecuteReaderAsync();
                    
                    var cryptos = new List<(int id, string nom, decimal dernierPrix)>();
                    while (await reader.ReadAsync())
                    {
                        cryptos.Add((
                            reader.GetInt32(0),
                            reader.GetString(1),
                            reader.GetDecimal(2)
                        ));
                    }

                    await reader.CloseAsync();

                    var firebasePrices = new List<object>();
                    foreach (var crypto in cryptos)
                    {
                        decimal initialPrice = initialPrices[crypto.id];
                        decimal maxVariation = initialPrice * 0.15m;
                        
                        decimal variation = (decimal)(_random.NextDouble() * 0.1 - 0.05);
                        decimal newPrice = crypto.dernierPrix * (1 + variation);
                        
                        decimal minPrice = initialPrice * 0.85m;
                        decimal maxPrice = initialPrice * 1.15m;
                        newPrice = Math.Max(minPrice, Math.Min(maxPrice, newPrice));

                        // Insérer dans PostgreSQL
                        var insertCmd = new NpgsqlCommand(@"
                            INSERT INTO prix_crypto (prix, date_prix, id_crypto)
                            VALUES (@prix, @date, @id_crypto)", connection);

                        var currentDate = DateTime.UtcNow;
                        insertCmd.Parameters.AddWithValue("@prix", newPrice);
                        insertCmd.Parameters.AddWithValue("@date", currentDate);
                        insertCmd.Parameters.AddWithValue("@id_crypto", crypto.id);

                        await insertCmd.ExecuteNonQueryAsync();

                        // Préparer les données pour Firebase
                        firebasePrices.Add(new
                        {
                            crypto_id = crypto.id,
                            nom_crypto = crypto.nom,
                            prix = newPrice,
                            date = currentDate.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                            variation_percent = variation * 100
                        });
                    }

                    // Envoyer les données à Firebase
                    await SendToFirebase(firebasePrices);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la génération des prix");
            }
        }

        private async Task SendToFirebase(List<object> prices)
        {
            try
            {
                var baseUrl = $"https://firestore.googleapis.com/v1/projects/{FirebaseProjectId}/databases/(default)/documents";
                
                foreach (var price in prices)
                {
                    var document = new
                    {
                        fields = new
                        {
                            crypto_id = new { integerValue = ((dynamic)price).crypto_id.ToString() },
                            nom_crypto = new { stringValue = ((dynamic)price).nom_crypto },
                            prix = new { doubleValue = (double)((dynamic)price).prix },
                            date = new { timestampValue = DateTime.Parse(((dynamic)price).date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ") },
                            variation_percent = new { doubleValue = (double)((dynamic)price).variation_percent }
                        }
                    };

                    var response = await _httpClient.PostAsJsonAsync(
                        $"{baseUrl}/cours-crypto?key={FirebaseApiKey}",
                        document
                    );

                    if (!response.IsSuccessStatusCode)
                    {
                        var error = await response.Content.ReadAsStringAsync();
                        _logger.LogError($"Erreur Firebase: {error}");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de l'envoi des données à Firebase");
            }
        }

        public Task StopAsync(CancellationToken cancellationToken)
        {
            _timer?.Change(Timeout.Infinite, 0);
            return Task.CompletedTask;
        }

        public void Dispose()
        {
            _timer?.Dispose();
        }
    }
} 