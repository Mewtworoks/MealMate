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
        Task<UserResponseDto?> LoginWithEmailAsync(EmailLoginDto request);
        Task<UserResponseDto?> RegisterAsync(RegisterDto request);
        Task<UserResponseDto?> SyncUserAsync(SyncUserDto request);
    }

    public class AuthService : IAuthService
    {
        private readonly IUserRepository _userRepository;
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;
        private readonly IConfiguration _configuration;
        private readonly IClerkService _clerkService;

        public AuthService(IUserRepository userRepository, AppDbContext context, IMapper mapper, IConfiguration configuration, IClerkService clerkService)
        {
            _userRepository = userRepository;
            _context = context;
            _mapper = mapper;
            _configuration = configuration;
            _clerkService = clerkService;
        }

        public async Task<UserResponseDto?> LoginWithEmailAsync(EmailLoginDto request)
        {
            if (string.IsNullOrWhiteSpace(request.Email)) return null;

            var emailClean = request.Email.Trim().ToLower();
            var user = await _userRepository.GetByEmailAsync(emailClean);

            var roleStr = string.IsNullOrWhiteSpace(request.Role) ? "Customer" : request.Role;
            var formattedRole = char.ToUpper(roleStr[0]) + roleStr.Substring(1).ToLower();

            if (user == null)
            {
                user = new User
                {
                    Id = Guid.NewGuid(),
                    Email = emailClean,
                    FullName = emailClean.Split('@')[0],
                    Role = formattedRole,
                    WalletBalance = 2500m,
                    CreditLimit = 500m,
                    CreditUsed = 0m,
                    LoyaltyPoints = 1000,
                    CreatedAt = DateTime.UtcNow
                };
                await _userRepository.AddAsync(user);
            }

            return _mapper.Map<UserResponseDto>(user);
        }

        public async Task<UserResponseDto?> RegisterAsync(RegisterDto request)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
                throw new InvalidOperationException("Email is required.");

            var emailClean = request.Email.Trim().ToLower();
            var roleStr = string.IsNullOrWhiteSpace(request.Role) ? "Customer" : request.Role;
            var formattedRole = char.ToUpper(roleStr[0]) + roleStr.Substring(1).ToLower();
            var phoneClean = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim();

            // 1. Pre-flight Duplicate Check in Database
            var existingUser = await _userRepository.GetByEmailAsync(emailClean);
            if (existingUser != null)
            {
                throw new InvalidOperationException("An account already exists with this email address.");
            }

            if (!string.IsNullOrWhiteSpace(phoneClean))
            {
                await ValidatePhoneNumberUniqueAsync(phoneClean);
            }

            // 2. Transactional User Creation with Clerk Proxy & Rollback
            using var transaction = await _context.Database.BeginTransactionAsync();
            string? createdClerkUserId = null;

            try
            {
                var newUser = new User
                {
                    Id = Guid.NewGuid(),
                    Email = emailClean,
                    FullName = !string.IsNullOrWhiteSpace(request.FullName) ? request.FullName : emailClean.Split('@')[0],
                    PhoneNumber = phoneClean,
                    Role = formattedRole,
                    WalletBalance = 2500m,
                    CreditLimit = 500m,
                    CreditUsed = 0m,
                    LoyaltyPoints = 1000,
                    CreatedAt = DateTime.UtcNow
                };
                await _userRepository.AddAsync(newUser);

                // Create user in Clerk (if Clerk SecretKey is configured)
                var clerkResult = await _clerkService.CreateUserAsync(emailClean, request.Password ?? "MealMate@123", newUser.FullName, formattedRole);
                if (!clerkResult.Success)
                {
                    await transaction.RollbackAsync();
                    throw new InvalidOperationException(clerkResult.Message ?? "Clerk registration failed.");
                }
                createdClerkUserId = clerkResult.UserId;

                await transaction.CommitAsync();

                return _mapper.Map<UserResponseDto>(newUser);
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                if (!string.IsNullOrEmpty(createdClerkUserId))
                {
                    await _clerkService.DeleteUserAsync(createdClerkUserId);
                }
                throw;
            }
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
                        FullName = name ?? email.Split('@')[0],
                        Role = googleRequest.Role,
                        WalletBalance = 2500m,
                        CreditLimit = 500m,
                        CreditUsed = 0m,
                        LoyaltyPoints = 1000,
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

        public async Task<UserResponseDto?> SyncUserAsync(SyncUserDto request)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
                throw new InvalidOperationException("Email is required.");

            var emailClean = request.Email.Trim().ToLower();
            var roleStr = string.IsNullOrWhiteSpace(request.Role) ? "Customer" : request.Role;
            var formattedRole = char.ToUpper(roleStr[0]) + roleStr.Substring(1).ToLower();
            var phoneClean = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim();

            var user = await _userRepository.GetByEmailAsync(emailClean);

            if (user != null)
            {
                if (!string.IsNullOrWhiteSpace(request.FullName)) user.FullName = request.FullName;
                if (!string.IsNullOrWhiteSpace(phoneClean)) user.PhoneNumber = phoneClean;
                user.Role = formattedRole;
                await _userRepository.UpdateAsync(user);
                return _mapper.Map<UserResponseDto>(user);
            }

            if (!string.IsNullOrWhiteSpace(phoneClean))
            {
                await ValidatePhoneNumberUniqueAsync(phoneClean);
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                user = new User
                {
                    Id = Guid.NewGuid(),
                    Email = emailClean,
                    FullName = !string.IsNullOrWhiteSpace(request.FullName) ? request.FullName : emailClean.Split('@')[0],
                    PhoneNumber = phoneClean,
                    Role = formattedRole,
                    WalletBalance = 2500m,
                    CreditLimit = 500m,
                    CreditUsed = 0m,
                    LoyaltyPoints = 1000,
                    CreatedAt = DateTime.UtcNow
                };
                await _userRepository.AddAsync(user);
                await transaction.CommitAsync();

                return _mapper.Map<UserResponseDto>(user);
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        private async Task ValidatePhoneNumberUniqueAsync(string phoneNumber)
        {
            var existing = await _userRepository.GetByPhoneNumberAsync(phoneNumber);
            if (existing != null)
            {
                throw new InvalidOperationException($"An account already exists with phone number '{phoneNumber}'.");
            }
        }
    }
}
