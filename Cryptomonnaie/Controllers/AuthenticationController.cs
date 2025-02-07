using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Net.Http.Headers;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Cryptomonnaie.Config;

namespace Cryptomonnaie.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthenticationController : ControllerBase
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthenticationController> _logger;
        private readonly FirebaseSettings _firebaseSettings;

        public AuthenticationController(
            IHttpClientFactory httpClientFactory, 
            IConfiguration configuration, 
            ILogger<AuthenticationController> logger,
            IOptions<FirebaseSettings> firebaseSettings)
        {
            _httpClient = httpClientFactory.CreateClient();
            _configuration = configuration;
            _logger = logger;
            _firebaseSettings = firebaseSettings.Value;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            try
            {
                // First step: Send credentials to identity provider
                var loginContent = new StringContent(
                    JsonSerializer.Serialize(new { email = request.Email, password = request.Password }),
                    Encoding.UTF8,
                    "application/json");

                var loginResponse = await _httpClient.PostAsync("http://node_app:3000/api/auth/login", loginContent);
                
                if (!loginResponse.IsSuccessStatusCode)
                {
                    var errorContent = await loginResponse.Content.ReadAsStringAsync();
                    return StatusCode((int)loginResponse.StatusCode, errorContent);
                }

                // Parse the response from identity provider to get the PIN
                var responseContent = await loginResponse.Content.ReadAsStringAsync();
                var responseData = JsonSerializer.Deserialize<JsonElement>(responseContent);
                
                return Ok(new { 
                    message = "Please check your email for the PIN code",
                    pin = responseData.GetProperty("pin").GetString()
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during login process");
                return StatusCode(500, "An error occurred during the login process");
            }
        }

        [HttpPost("verify-pin")]
        public async Task<IActionResult> VerifyPin([FromBody] VerifyPinRequest request)
        {
            try
            {
                var verifyContent = new StringContent(
                    JsonSerializer.Serialize(new { email = request.Email, codePin = request.Pin }),
                    Encoding.UTF8,
                    "application/json");

                var verifyResponse = await _httpClient.PostAsync("http://node_app:3000/api/auth/verify-pin", verifyContent);

                if (!verifyResponse.IsSuccessStatusCode)
                {
                    var errorContent = await verifyResponse.Content.ReadAsStringAsync();
                    return StatusCode((int)verifyResponse.StatusCode, errorContent);
                }

                var responseContent = await verifyResponse.Content.ReadAsStringAsync();
                return Ok(JsonSerializer.Deserialize<object>(responseContent));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during PIN verification");
                return StatusCode(500, "An error occurred during PIN verification");
            }
        }

        [HttpGet("user-info")]
        public async Task<IActionResult> GetUserInfo()
        {
            try
            {
                // Get the token from the Authorization header
                var token = Request.Headers["Authorization"].FirstOrDefault()?.Split(" ").Last();
                if (string.IsNullOrEmpty(token))
                {
                    return Unauthorized(new { message = "No token provided" });
                }

                // Verify token with identity provider
                var verifyContent = new StringContent("", Encoding.UTF8, "application/json");
                _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
                
                var response = await _httpClient.GetAsync("http://node_app:3000/api/auth/verify-token");
                
                if (!response.IsSuccessStatusCode)
                {
                    return Unauthorized(new { message = "Invalid token" });
                }

                var userInfo = await response.Content.ReadAsStringAsync();
                return Ok(JsonSerializer.Deserialize<object>(userInfo));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user info");
                return StatusCode(500, "An error occurred while getting user info");
            }
        }

        private async Task CreateFirebaseWallet(string userId, string email)
        {
            try
            {
                var document = new
                {
                    fields = new
                    {
                        userId = new { stringValue = userId },
                        email = new { stringValue = email },
                        solde = new { doubleValue = 10.0 },
                        transactions = new { arrayValue = new { values = new object[] { } } },
                        createdAt = new { timestampValue = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ") }
                    }
                };

                var url = $"{_firebaseSettings.FirestoreUrl}/portefeuilles/{userId}?key={_firebaseSettings.ApiKey}";
                
                var response = await _httpClient.PatchAsync(url, 
                    new StringContent(
                        JsonSerializer.Serialize(document),
                        Encoding.UTF8,
                        "application/json"
                    )
                );

                if (!response.IsSuccessStatusCode)
                {
                    var error = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Échec de création du portefeuille Firebase pour l'utilisateur {UserId}. Erreur: {Error}", userId, error);
                    throw new Exception("Échec de création du portefeuille Firebase");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la création du portefeuille Firebase");
                throw;
            }
        }

        [HttpPost("mobile-register")]
        public async Task<IActionResult> MobileRegister([FromBody] RegisterRequest request)
        {
            try
            {
                // 1. Créer d'abord le compte dans Firebase
                var firebaseContent = new StringContent(
                    JsonSerializer.Serialize(new { 
                        email = request.Email,
                        password = request.Password,
                        returnSecureToken = true
                    }),
                    Encoding.UTF8,
                    "application/json");

                var firebaseResponse = await _httpClient.PostAsync(
                    $"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={_firebaseSettings.ApiKey}",
                    firebaseContent
                );

                if (!firebaseResponse.IsSuccessStatusCode)
                {
                    var firebaseError = await firebaseResponse.Content.ReadAsStringAsync();
                    _logger.LogError("Échec de création du compte Firebase: {Error}", firebaseError);
                    return StatusCode((int)firebaseResponse.StatusCode, "Échec de création du compte Firebase");
                }

                // Extraire l'ID utilisateur Firebase de la réponse
                var firebaseResponseContent = await firebaseResponse.Content.ReadAsStringAsync();
                var firebaseData = JsonSerializer.Deserialize<JsonElement>(firebaseResponseContent);
                var firebaseUserId = firebaseData.GetProperty("localId").GetString();

                // Créer le portefeuille Firebase
                await CreateFirebaseWallet(firebaseUserId, request.Email);

                // 2. Si Firebase réussit, procéder à l'inscription directe
                var registerContent = new StringContent(
                    JsonSerializer.Serialize(new { 
                        username = request.Username,
                        email = request.Email, 
                        password = request.Password,
                        isMobileRegistration = true
                    }),
                    Encoding.UTF8,
                    "application/json");

                var registerResponse = await _httpClient.PostAsync("http://node_app:3000/api/users/direct-register", registerContent);
                
                if (!registerResponse.IsSuccessStatusCode)
                {
                    var errorContent = await registerResponse.Content.ReadAsStringAsync();
                    return StatusCode((int)registerResponse.StatusCode, errorContent);
                }

                var responseContent = await registerResponse.Content.ReadAsStringAsync();
                var response = JsonSerializer.Deserialize<JsonElement>(responseContent);
                
                // Créer le portefeuille
                if (response.TryGetProperty("userId", out JsonElement userIdElement))
                {
                    var userId = userIdElement.GetInt32();
                    var loggerFactory = HttpContext.RequestServices.GetService<ILoggerFactory>();
                    if (loggerFactory != null)
                    {
                        var portefeuilleLogger = loggerFactory.CreateLogger<PortefeuilleController>();
                        var portefeuilleController = new PortefeuilleController(
                            _configuration, 
                            portefeuilleLogger, 
                            _httpClient,
                            Options.Create(_firebaseSettings)
                        );
                        await portefeuilleController.CreateWallet(new CreateWalletRequest { UserId = userId });
                    }
                }

                return Ok(JsonSerializer.Deserialize<object>(responseContent));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur pendant le processus d'inscription mobile");
                return StatusCode(500, "Une erreur est survenue pendant le processus d'inscription");
            }
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            try
            {
                // 1. Créer d'abord le compte dans Firebase
                var firebaseContent = new StringContent(
                    JsonSerializer.Serialize(new { 
                        email = request.Email,
                        password = request.Password,
                        returnSecureToken = true
                    }),
                    Encoding.UTF8,
                    "application/json");

                var firebaseResponse = await _httpClient.PostAsync(
                    $"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={_firebaseSettings.ApiKey}",
                    firebaseContent
                );

                if (!firebaseResponse.IsSuccessStatusCode)
                {
                    var firebaseError = await firebaseResponse.Content.ReadAsStringAsync();
                    _logger.LogError("Échec de création du compte Firebase: {Error}", firebaseError);
                    return StatusCode((int)firebaseResponse.StatusCode, "Échec de création du compte Firebase");
                }

                // Extraire l'ID utilisateur Firebase de la réponse
                var firebaseResponseContent = await firebaseResponse.Content.ReadAsStringAsync();
                var firebaseData = JsonSerializer.Deserialize<JsonElement>(firebaseResponseContent);
                var firebaseUserId = firebaseData.GetProperty("localId").GetString();

                // Créer le portefeuille Firebase
                await CreateFirebaseWallet(firebaseUserId, request.Email);

                // 2. Si Firebase réussit, procéder à l'inscription dans la base locale
                var registerContent = new StringContent(
                    JsonSerializer.Serialize(new { 
                        username = request.Username,
                        email = request.Email, 
                        password = request.Password 
                    }),
                    Encoding.UTF8,
                    "application/json");

                var registerResponse = await _httpClient.PostAsync("http://node_app:3000/api/users/register", registerContent);
                
                if (!registerResponse.IsSuccessStatusCode)
                {
                    // En cas d'échec de l'inscription locale, on devrait idéalement supprimer le compte Firebase
                    // Mais Firebase ne fournit pas d'API simple pour cela, l'utilisateur devra se reconnecter
                    var errorContent = await registerResponse.Content.ReadAsStringAsync();
                    return StatusCode((int)registerResponse.StatusCode, errorContent);
                }

                var responseContent = await registerResponse.Content.ReadAsStringAsync();
                var responseData = JsonSerializer.Deserialize<JsonElement>(responseContent);
                
                return Ok(new { 
                    message = "Please check your email for the PIN code",
                    pin = responseData.GetProperty("pin").GetString()
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur pendant le processus d'inscription");
                return StatusCode(500, "Une erreur est survenue pendant le processus d'inscription");
            }
        }

        [HttpPost("verify-registration-pin")]
        public async Task<IActionResult> VerifyRegistrationPin([FromBody] VerifyPinRequest request)
        {
            try
            {
                var verifyContent = new StringContent(
                    JsonSerializer.Serialize(new { email = request.Email, codePin = request.Pin }),
                    Encoding.UTF8,
                    "application/json");

                var verifyResponse = await _httpClient.PostAsync("http://node_app:3000/api/users/verify-pin", verifyContent);

                if (!verifyResponse.IsSuccessStatusCode)
                {
                    var errorContent = await verifyResponse.Content.ReadAsStringAsync();
                    return StatusCode((int)verifyResponse.StatusCode, errorContent);
                }

                var responseContent = await verifyResponse.Content.ReadAsStringAsync();
                var response = JsonSerializer.Deserialize<JsonElement>(responseContent);
                
                // Extract userId from the response
                if (response.TryGetProperty("userId", out JsonElement userIdElement))
                {
                    var userId = userIdElement.GetInt32();
                    Console.WriteLine($"Creating wallet for user ID: {userId}");
                    _logger.LogInformation("Creating wallet for user ID: {UserId}", userId);
                    var loggerFactory = HttpContext.RequestServices.GetService<ILoggerFactory>();
                    if (loggerFactory != null)
                    {
                        var portefeuilleLogger = loggerFactory.CreateLogger<PortefeuilleController>();
                        var portefeuilleController = new PortefeuilleController(
                            _configuration, 
                            portefeuilleLogger, 
                            _httpClient,
                            Options.Create(_firebaseSettings)
                        );
                        await portefeuilleController.CreateWallet(new CreateWalletRequest { UserId = userId });
                        Console.WriteLine($"Wallet created successfully for user ID: {userId}");
                        _logger.LogInformation("Wallet created successfully for user ID: {UserId}", userId);
                    }
                }
                else
                {
                    Console.WriteLine("No userId found in response");
                    Console.WriteLine($"Response content: {responseContent}");
                    _logger.LogWarning("No userId found in response. Content: {Content}", responseContent);
                }

                return Ok(JsonSerializer.Deserialize<object>(responseContent));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during registration PIN verification");
                return StatusCode(500, "An error occurred during registration PIN verification");
            }
        }

        [HttpPost("admin-login")]
        public async Task<IActionResult> AdminLogin([FromBody] LoginRequest request)
        {
            try
            {
                var loginContent = new StringContent(
                    JsonSerializer.Serialize(new { 
                        email = request.Email, 
                        password = request.Password,
                        isAdmin = true 
                    }),
                    Encoding.UTF8,
                    "application/json");

                var loginResponse = await _httpClient.PostAsync("http://node_app:3000/api/auth/admin-login", loginContent);
                
                if (!loginResponse.IsSuccessStatusCode)
                {
                    var errorContent = await loginResponse.Content.ReadAsStringAsync();
                    return StatusCode((int)loginResponse.StatusCode, errorContent);
                }

                var responseContent = await loginResponse.Content.ReadAsStringAsync();
                var responseData = JsonSerializer.Deserialize<JsonElement>(responseContent);
                
                return Ok(new { 
                    message = "Please check your email for the PIN code",
                    pin = responseData.GetProperty("pin").GetString()
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during admin login process");
                return StatusCode(500, "An error occurred during the login process");
            }
        }

        [HttpPost("verify-admin-pin")]
        public async Task<IActionResult> VerifyAdminPin([FromBody] VerifyPinRequest request)
        {
            try
            {
                var verifyContent = new StringContent(
                    JsonSerializer.Serialize(new { 
                        email = request.Email, 
                        codePin = request.Pin,
                        isAdmin = true
                    }),
                    Encoding.UTF8,
                    "application/json");

                var verifyResponse = await _httpClient.PostAsync("http://node_app:3000/api/auth/verify-admin-pin", verifyContent);

                if (!verifyResponse.IsSuccessStatusCode)
                {
                    var errorContent = await verifyResponse.Content.ReadAsStringAsync();
                    return StatusCode((int)verifyResponse.StatusCode, errorContent);
                }

                var responseContent = await verifyResponse.Content.ReadAsStringAsync();
                return Ok(JsonSerializer.Deserialize<object>(responseContent));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during admin PIN verification");
                return StatusCode(500, "An error occurred during PIN verification");
            }
        }
    }

    public class LoginRequest
    {
        public string Email { get; set; }
        public string Password { get; set; }
    }

    public class VerifyPinRequest
    {
        public string Email { get; set; }
        public string Pin { get; set; }
    }

    public class RegisterRequest
    {
        public string Username { get; set; }
        public string Email { get; set; }
        public string Password { get; set; }
    }
} 