using MealMate.Api.Models;
using MealMate.Api.Repositories;
using MealMate.Api.DTOs;
using MealMate.Api.Data;
using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Google.Apis.Auth;
using Microsoft.Extensions.Configuration;

namespace MealMate.Api.Services
{
    public interface IAuthService
    {
        Task<UserResponseDto?> LoginWithGoogleAsync(GoogleLoginDto googleRequest);
    }

    public class AuthService : IAuthService
    {
        private readonly IUserRepository _userRepository;
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;
        private readonly IConfiguration _configuration;

        public AuthService(IUserRepository userRepository, AppDbContext context, IMapper mapper, IConfiguration configuration)
        {
            _userRepository = userRepository;
            _context = context;
            _mapper = mapper;
            _configuration = configuration;
        }

        public async Task<UserResponseDto?> LoginWithGoogleAsync(GoogleLoginDto googleRequest)
        {
            try
            {
                var clientId = _configuration["Google:ClientId"];
                Console.WriteLine($"Server is validating token for ClientID: {clientId}");
                
                var settings = new GoogleJsonWebSignature.ValidationSettings()
                {
                    Audience = new List<string> { clientId! }
                };

                var payload = await GoogleJsonWebSignature.ValidateAsync(googleRequest.IdToken, settings);

                if (payload == null) return null;

                var email = payload.Email;
                var name = payload.Name;

                var user = await _userRepository.GetByEmailAsync(email);

                if (user == null)
                {
                    user = new User
                    {
                        Id = Guid.NewGuid(),
                        Email = email,
                        FullName = name,
                        Role = googleRequest.Role,
                        CreatedAt = DateTime.UtcNow
                    };
                    await _userRepository.AddAsync(user);
                }

                return _mapper.Map<UserResponseDto>(user);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Google Auth Error: {ex.Message}");
                Console.WriteLine($"Stack Trace: {ex.StackTrace}");
                return null;
            }
        }
    }
}
