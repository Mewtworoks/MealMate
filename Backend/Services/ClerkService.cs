using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace MealMate.Api.Services
{
    public interface IClerkService
    {
        Task<ClerkUserResult> CreateUserAsync(string email, string password, string? fullName, string? role);
        Task<bool> DeleteUserAsync(string clerkUserId);
    }

    public class ClerkUserResult
    {
        public bool Success { get; set; }
        public string? UserId { get; set; }
        public string? Message { get; set; }
    }

    public class ClerkService : IClerkService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<ClerkService> _logger;

        public ClerkService(HttpClient httpClient, IConfiguration configuration, ILogger<ClerkService> logger)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<ClerkUserResult> CreateUserAsync(string email, string password, string? fullName, string? role)
        {
            var secretKey = _configuration["Clerk:SecretKey"] ?? Environment.GetEnvironmentVariable("CLERK_SECRET_KEY");
            if (string.IsNullOrWhiteSpace(secretKey))
            {
                _logger.LogInformation("Clerk SecretKey not configured. Skipping server-side Clerk API creation.");
                return new ClerkUserResult { Success = true, UserId = null };
            }

            try
            {
                var nameParts = (fullName ?? "").Split(' ', 2);
                var firstName = nameParts.Length > 0 ? nameParts[0] : "";
                var lastName = nameParts.Length > 1 ? nameParts[1] : "";

                var payload = new
                {
                    email_address = new[] { email },
                    password = password,
                    first_name = firstName,
                    last_name = lastName,
                    skip_password_checks = true,
                    public_metadata = new { role = role ?? "Customer" }
                };

                var request = new HttpRequestMessage(HttpMethod.Post, "https://api.clerk.com/v1/users")
                {
                    Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
                };
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", secretKey);

                var response = await _httpClient.SendAsync(request);
                var json = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    using var doc = JsonDocument.Parse(json);
                    var userId = doc.RootElement.GetProperty("id").GetString();
                    return new ClerkUserResult { Success = true, UserId = userId };
                }

                _logger.LogWarning("Clerk API Create User failed: {Response}", json);
                string errorMsg = "Clerk account creation failed.";
                try
                {
                    using var doc = JsonDocument.Parse(json);
                    if (doc.RootElement.TryGetProperty("errors", out var errors) && errors.GetArrayLength() > 0)
                    {
                        errorMsg = errors[0].GetProperty("long_message").GetString() 
                            ?? errors[0].GetProperty("message").GetString() 
                            ?? errorMsg;
                    }
                }
                catch { }

                return new ClerkUserResult { Success = false, Message = errorMsg };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Clerk CreateUserAsync Exception");
                return new ClerkUserResult { Success = false, Message = $"Clerk service exception: {ex.Message}" };
            }
        }

        public async Task<bool> DeleteUserAsync(string clerkUserId)
        {
            var secretKey = _configuration["Clerk:SecretKey"] ?? Environment.GetEnvironmentVariable("CLERK_SECRET_KEY");
            if (string.IsNullOrWhiteSpace(secretKey) || string.IsNullOrWhiteSpace(clerkUserId))
            {
                return true;
            }

            try
            {
                var request = new HttpRequestMessage(HttpMethod.Delete, $"https://api.clerk.com/v1/users/{clerkUserId}");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", secretKey);

                var response = await _httpClient.SendAsync(request);
                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Successfully rolled back (deleted) Clerk user: {UserId}", clerkUserId);
                    return true;
                }

                _logger.LogWarning("Failed to rollback Clerk user {UserId}: {Status}", clerkUserId, response.StatusCode);
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Clerk DeleteUserAsync Exception for {UserId}", clerkUserId);
                return false;
            }
        }
    }
}
