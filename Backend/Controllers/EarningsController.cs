using Microsoft.AspNetCore.Mvc;
using MealMate.Api.Services;
using MealMate.Api.DTOs;

namespace MealMate.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EarningsController : ControllerBase
    {
        private readonly IEarningsService _earningsService;

        public EarningsController(IEarningsService earningsService)
        {
            _earningsService = earningsService;
        }

        /// <summary>
        /// Get full earnings summary for an agent — today, week, month,
        /// weekly chart, advance deduction, pending payout, recent orders, monthly summary.
        /// </summary>
        [HttpGet("{agentId}/summary")]
        public async Task<IActionResult> GetEarningsSummary(Guid agentId)
        {
            try
            {
                var summary = await _earningsService.GetEarningsSummaryAsync(agentId);
                return Ok(summary);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Request a payout withdrawal to bank/UPI.
        /// </summary>
        [HttpPost("{agentId}/withdraw")]
        public async Task<IActionResult> RequestWithdrawal(Guid agentId, [FromBody] WithdrawRequestDto request)
        {
            try
            {
                var result = await _earningsService.RequestWithdrawalAsync(agentId, request.Amount);
                if (!result.Success)
                    return BadRequest(result);

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}
