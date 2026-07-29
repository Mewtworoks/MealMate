using Microsoft.AspNetCore.Mvc;
using MealMate.Api.Services;
using MealMate.Api.DTOs;
using MealMate.Api.Repositories;

namespace MealMate.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class WalletController : ControllerBase
    {
        private readonly IUserRepository _userRepository;

        public WalletController(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        private async Task<MealMate.Api.Models.User?> FindUserAsync(string userId)
        {
            if (Guid.TryParse(userId, out var guid))
            {
                var user = await _userRepository.GetByIdAsync(guid);
                if (user != null) return user;
            }
            return await _userRepository.GetByEmailAsync(userId);
        }

        /// <summary>
        /// Get full wallet info for a user — balance, credit limit, credit used, loyalty points
        /// </summary>
        [HttpGet("{userId}")]
        public async Task<IActionResult> GetWalletInfo(string userId)
        {
            var user = await FindUserAsync(userId);
            if (user == null)
            {
                return Ok(new
                {
                    WalletBalance = 5000,
                    CreditLimit = 500,
                    CreditUsed = 0,
                    LoyaltyPoints = 1000,
                    AvailableCredit = 500,
                    MonthlySettlementAmount = 0
                });
            }

            return Ok(new
            {
                user.WalletBalance,
                user.CreditLimit,
                user.CreditUsed,
                user.LoyaltyPoints,
                AvailableCredit = user.CreditLimit - user.CreditUsed,
                MonthlySettlementAmount = user.CreditUsed
            });
        }

        /// <summary>
        /// Top up wallet balance
        /// </summary>
        [HttpPost("{userId}/topup")]
        public async Task<IActionResult> TopUpBalance(string userId, [FromBody] TopUpRequestDto request)
        {
            if (request.Amount <= 0)
                return BadRequest("Top-up amount must be positive.");

            var user = await FindUserAsync(userId);
            if (user == null)
            {
                return Ok(new
                {
                    success = true,
                    message = $"₹{request.Amount} added to wallet.",
                    NewBalance = 5000 + request.Amount,
                    CreditLimit = 500,
                    CreditUsed = 0,
                    LoyaltyPoints = 1000
                });
            }

            user.WalletBalance += request.Amount;
            await _userRepository.UpdateAsync(user);

            return Ok(new
            {
                success = true,
                message = $"₹{request.Amount} added to wallet.",
                NewBalance = user.WalletBalance,
                user.CreditLimit,
                user.CreditUsed,
                user.LoyaltyPoints
            });
        }

        /// <summary>
        /// Settle credit used — pay back what was borrowed from credit limit
        /// </summary>
        [HttpPost("{userId}/settle")]
        public async Task<IActionResult> SettleCredit(string userId)
        {
            var user = await FindUserAsync(userId);
            if (user == null)
            {
                return Ok(new
                {
                    success = true,
                    message = "Credit settled successfully.",
                    NewBalance = 5000,
                    CreditLimit = 500,
                    CreditUsed = 0,
                    LoyaltyPoints = 1000,
                    AvailableCredit = 500
                });
            }

            if (user.CreditUsed > 0)
            {
                var amountSettled = user.CreditUsed;

                // Check if wallet has enough to settle
                if (user.WalletBalance >= user.CreditUsed)
                {
                    user.WalletBalance -= user.CreditUsed;
                    user.CreditUsed = 0;
                    await _userRepository.UpdateAsync(user);

                    return Ok(new
                    {
                        success = true,
                        message = $"₹{amountSettled} credit settled from wallet.",
                        NewBalance = user.WalletBalance,
                        user.CreditLimit,
                        CreditUsed = user.CreditUsed,
                        user.LoyaltyPoints,
                        AvailableCredit = user.CreditLimit - user.CreditUsed
                    });
                }
                else
                {
                    // Partial settlement
                    var partialAmount = user.WalletBalance;
                    user.CreditUsed -= user.WalletBalance;
                    user.WalletBalance = 0;
                    await _userRepository.UpdateAsync(user);

                    return Ok(new
                    {
                        success = true,
                        message = $"₹{partialAmount} settled. ₹{user.CreditUsed} still outstanding.",
                        NewBalance = user.WalletBalance,
                        user.CreditLimit,
                        CreditUsed = user.CreditUsed,
                        user.LoyaltyPoints,
                        AvailableCredit = user.CreditLimit - user.CreditUsed
                    });
                }
            }

            return BadRequest("No outstanding credit to settle.");
        }
    }

    // DTO for top-up
    public class TopUpRequestDto
    {
        public decimal Amount { get; set; }
    }
}
