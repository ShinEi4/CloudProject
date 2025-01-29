using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Net.Http.Headers;
using Microsoft.Extensions.DependencyInjection;

namespace Cryptomonnaie.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthenticationController : ControllerBase
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthenticationController> _logger;

        public AuthenticationController(IHttpClientFactory httpClientFactory, IConfiguration configuration, ILogger<AuthenticationController> logger)
        {
            _httpClient = httpClientFactory.CreateClient();
            _configuration = configuration;
            _logger = logger;
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

                return Ok(new { message = "Please check your email for the PIN code" });
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

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            try
            {
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
                    var errorContent = await registerResponse.Content.ReadAsStringAsync();
                    return StatusCode((int)registerResponse.StatusCode, errorContent);
                }

                return Ok(new { message = "Please check your email for the PIN code" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during registration process");
                return StatusCode(500, "An error occurred during the registration process");
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
                        var portefeuilleController = new PortefeuilleController(_configuration, portefeuilleLogger);
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