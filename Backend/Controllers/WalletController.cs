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

        /// <summary>
        /// Get full wallet info for a user — balance, credit limit, credit used, loyalty points
        /// </summary>
        [HttpGet("{userId}")]
        public async Task<IActionResult> GetWalletInfo(Guid userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) return NotFound();

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
        public async Task<IActionResult> TopUpBalance(Guid userId, [FromBody] TopUpRequestDto request)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) return NotFound();

            if (request.Amount <= 0)
                return BadRequest("Top-up amount must be positive.");

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
        public async Task<IActionResult> SettleCredit(Guid userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) return NotFound();

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
