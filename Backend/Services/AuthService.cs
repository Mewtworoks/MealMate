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

        public AuthService(IUserRepository userRepository, AppDbContext context, IMapper mapper, IConfiguration configuration)
        {
            _userRepository = userRepository;
            _context = context;
            _mapper = mapper;
            _configuration = configuration;
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
                var newId = Guid.NewGuid();
                var fullName = emailClean.Split('@')[0];
                await InsertUserRawSql(newId, emailClean, fullName, "", formattedRole);
                user = await _userRepository.GetByEmailAsync(emailClean);
                if (user == null) return null;
            }

            return _mapper.Map<UserResponseDto>(user);
        }

        public async Task<UserResponseDto?> RegisterAsync(RegisterDto request)
        {
            if (string.IsNullOrWhiteSpace(request.Email)) return null;

            var emailClean = request.Email.Trim().ToLower();
            var user = await _userRepository.GetByEmailAsync(emailClean);

            var roleStr = string.IsNullOrWhiteSpace(request.Role) ? "Customer" : request.Role;
            var formattedRole = char.ToUpper(roleStr[0]) + roleStr.Substring(1).ToLower();

            var phoneClean = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim();

            if (user == null)
            {
                var newId = Guid.NewGuid();
                await InsertUserRawSql(newId, emailClean, request.FullName ?? emailClean.Split('@')[0], phoneClean, formattedRole);
                user = await _userRepository.GetByEmailAsync(emailClean);
                if (user == null) return null;
            }
            else
            {
                if (!string.IsNullOrWhiteSpace(request.FullName)) user.FullName = request.FullName;
                if (!string.IsNullOrWhiteSpace(request.PhoneNumber)) user.PhoneNumber = request.PhoneNumber;
                user.Role = formattedRole;
                await _userRepository.UpdateAsync(user);
            }

            return _mapper.Map<UserResponseDto>(user);
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
                    var newId = Guid.NewGuid();
                    await InsertUserRawSql(newId, email, name ?? email.Split('@')[0], "", googleRequest.Role);
                    user = await _userRepository.GetByEmailAsync(email);
                    if (user == null) return null;
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
            try
            {
                if (string.IsNullOrWhiteSpace(request.Email)) return null;

                var emailClean = request.Email.Trim().ToLower();
                var user = await _userRepository.GetByEmailAsync(emailClean);

                var roleStr = string.IsNullOrWhiteSpace(request.Role) ? "Customer" : request.Role;
                var formattedRole = char.ToUpper(roleStr[0]) + roleStr.Substring(1).ToLower();
                var phoneClean = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim();

                if (user == null)
                {
                    var newGuid = Guid.NewGuid();
                    var fullName = !string.IsNullOrWhiteSpace(request.FullName) ? request.FullName : emailClean.Split('@')[0];
                    await InsertUserRawSql(newGuid, emailClean, fullName, phoneClean, formattedRole);
                    user = await _userRepository.GetByEmailAsync(emailClean);
                    if (user == null) return null;
                }
                else
                {
                    if (!string.IsNullOrWhiteSpace(request.FullName)) user.FullName = request.FullName;
                    if (!string.IsNullOrWhiteSpace(request.PhoneNumber)) user.PhoneNumber = request.PhoneNumber;
                    user.Role = formattedRole;
                    await _userRepository.UpdateAsync(user);
                }

                return _mapper.Map<UserResponseDto>(user);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"SyncUser Error: {ex.Message}");
                Console.WriteLine($"Stack Trace: {ex.StackTrace}");
                return null;
            }
        }

        /// <summary>
        /// Insert a user using raw SQL to avoid EF Core including model columns that don't yet exist in the remote DB.
        /// Only uses core columns guaranteed to be present in the Users table.
        /// </summary>
        private async Task InsertUserRawSql(Guid id, string email, string fullName, string? phoneNumber, string role)
        {
            await _context.Database.ExecuteSqlRawAsync(
                "INSERT INTO Users (Id, Email, FullName, PhoneNumber, Role, WalletBalance, CreditLimit, CreditUsed, LoyaltyPoints, CreatedAt) VALUES ({0}, {1}, {2}, {3}, {4}, {5}, {6}, {7}, {8}, {9})",
                id.ToString(),
                email,
                fullName,
                phoneNumber,
                role,
                2500m,
                500m,
                0m,
                1000,
                DateTime.UtcNow
            );
        }
    }
}
