using System;
using System.Threading;
using System.Threading.Tasks;
using Npgsql;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;

namespace Cryptomonnaie.Services
{
    public class CryptoService : IHostedService, IDisposable
    {
        private Timer _timer;
        private readonly string _connectionString;
        private readonly Random _random = new Random();
        private readonly ILogger<CryptoService> _logger;

        public CryptoService(IConfiguration configuration, ILogger<CryptoService> logger)
        {
            _connectionString = "Server=postgres;Port=5432;Database=identity_db;User Id=postgres;Password=postgres_password;";
            _logger = logger;
        }

        public Task StartAsync(CancellationToken cancellationToken)
        {
            _timer = new Timer(GenerateNewPrices, null, TimeSpan.FromSeconds(15), TimeSpan.FromSeconds(10));
            return Task.CompletedTask;
        }

        private async void GenerateNewPrices(object state)
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

                    foreach (var crypto in cryptos)
                    {
                        decimal initialPrice = initialPrices[crypto.id];
                        decimal maxVariation = initialPrice * 0.15m;
                        
                        decimal variation = (decimal)(_random.NextDouble() * 0.1 - 0.05);
                        decimal newPrice = crypto.dernierPrix * (1 + variation);
                        
                        decimal minPrice = initialPrice * 0.85m;
                        decimal maxPrice = initialPrice * 1.15m;
                        newPrice = Math.Max(minPrice, Math.Min(maxPrice, newPrice));

                        var insertCmd = new NpgsqlCommand(@"
                            INSERT INTO prix_crypto (prix, date_prix, id_crypto)
                            VALUES (@prix, @date, @id_crypto)", connection);

                        insertCmd.Parameters.AddWithValue("@prix", newPrice);
                        insertCmd.Parameters.AddWithValue("@date", DateTime.UtcNow);
                        insertCmd.Parameters.AddWithValue("@id_crypto", crypto.id);

                        await insertCmd.ExecuteNonQueryAsync();
                        // _logger.LogInformation($"Nouveau prix pour {crypto.nom}: {newPrice}");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la génération des prix");
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