using Microsoft.AspNetCore.Mvc;
using MealMate.Api.Services;
using MealMate.Api.DTOs;

namespace MealMate.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
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
    }
}
