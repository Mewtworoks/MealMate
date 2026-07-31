using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MealMate.Api.Services;
using MealMate.Api.DTOs;
using MealMate.Api.Data;

namespace MealMate.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly AppDbContext _context;

        public AuthController(IAuthService authService, AppDbContext context)
        {
            _authService = authService;
            _context = context;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] EmailLoginDto request)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
                return BadRequest("Email is required.");

            var result = await _authService.LoginWithEmailAsync(request);

            if (result == null)
            {
                return BadRequest(new { success = false, message = "Login failed." });
            }

            return Ok(new { success = true, user = result });
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto request)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
                return BadRequest("Email is required.");

            var result = await _authService.RegisterAsync(request);

            if (result == null)
            {
                return BadRequest(new { success = false, message = "Registration failed." });
            }

            return Ok(new { success = true, user = result });
        }

        [HttpPost("google-login")]
        public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginDto request)
        {
            if (string.IsNullOrEmpty(request.IdToken))
                return BadRequest("ID Token is required.");

            var result = await _authService.LoginWithGoogleAsync(request);

            if (result == null)
            {
                return BadRequest(new { success = false, message = "Google session failed. Check server logs for details." });
            }

            return Ok(new { success = true, user = result });
        }

        [HttpPost("sync")]
        public async Task<IActionResult> SyncUser([FromBody] SyncUserDto request)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
                return BadRequest("Email is required.");

            try
            {
                var emailClean = request.Email.Trim().ToLower();
                var roleStr = string.IsNullOrWhiteSpace(request.Role) ? "Customer" : request.Role;
                var formattedRole = char.ToUpper(roleStr[0]) + roleStr.Substring(1).ToLower();
                var fullName = !string.IsNullOrWhiteSpace(request.FullName) ? request.FullName : emailClean.Split('@')[0];
                var newId = Guid.NewGuid();

                // Check if user already exists using ADO.NET (avoids EF model/column issues entirely)
                var conn = _context.Database.GetDbConnection();
                if (conn.State != System.Data.ConnectionState.Open) await conn.OpenAsync();

                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT COUNT(*) FROM Users WHERE Email = @email";
                    var param = cmd.CreateParameter();
                    param.ParameterName = "@email";
                    param.Value = emailClean;
                    cmd.Parameters.Add(param);
                    var count = Convert.ToInt64(await cmd.ExecuteScalarAsync());

                    if (count > 0)
                    {
                        return Ok(new { success = true, message = "User already synced." });
                    }
                }

                // Insert using raw ADO.NET — only core columns guaranteed to exist
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "INSERT INTO Users (Id, Email, FullName, PhoneNumber, Role, WalletBalance, CreditLimit, CreditUsed, LoyaltyPoints, CreatedAt) VALUES (@id, @email, @name, @phone, @role, @wallet, @credit, @used, @points, @created)";
                    
                    void AddParam(string name, object val) { var p = cmd.CreateParameter(); p.ParameterName = name; p.Value = val; cmd.Parameters.Add(p); }
                    
                    AddParam("@id", newId.ToString());
                    AddParam("@email", emailClean);
                    AddParam("@name", fullName);
                    AddParam("@phone", request.PhoneNumber ?? "");
                    AddParam("@role", formattedRole);
                    AddParam("@wallet", 2500m);
                    AddParam("@credit", 500m);
                    AddParam("@used", 0m);
                    AddParam("@points", 1000);
                    AddParam("@created", DateTime.UtcNow);

                    await cmd.ExecuteNonQueryAsync();
                }

                return Ok(new { success = true, message = "User synced to database.", userId = newId });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"SyncUser Controller Error: {ex.Message}");
                Console.WriteLine($"Stack: {ex.StackTrace}");
                return StatusCode(500, new { success = false, message = $"Sync error: {ex.Message}" });
            }
        }
    }
}
