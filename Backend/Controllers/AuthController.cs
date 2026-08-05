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
                return BadRequest(new { success = false, message = "Email is required." });

            try
            {
                var result = await _authService.RegisterAsync(request);
                if (result == null)
                {
                    return BadRequest(new { success = false, message = "Registration failed." });
                }
                return Ok(new { success = true, user = result });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"Registration error: {ex.Message}" });
            }
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
                return BadRequest(new { success = false, message = "Email is required." });

            try
            {
                var result = await _authService.SyncUserAsync(request);
                if (result == null)
                {
                    return BadRequest(new { success = false, message = "User sync failed." });
                }

                return Ok(new { success = true, message = "User synced to database.", user = result });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"SyncUser Controller Error: {ex.Message}");
                return StatusCode(500, new { success = false, message = $"Sync error: {ex.Message}" });
            }
        }
    }
}
