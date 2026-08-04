using Microsoft.AspNetCore.Mvc;
using MealMate.Api.Services;
using MealMate.Api.DTOs;

namespace MealMate.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SubscriptionsController : ControllerBase
    {
        private readonly ISubscriptionService _service;

        public SubscriptionsController(ISubscriptionService service)
        {
            _service = service;
        }

        /// <summary>Create a new subscription.</summary>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateSubscriptionDto dto)
        {
            try
            {
                var result = await _service.CreateSubscriptionAsync(dto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error creating subscription: {ex.Message}");
            }
        }

        /// <summary>Get subscription by ID.</summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var sub = await _service.GetByIdAsync(id);
            if (sub == null) return NotFound();
            return Ok(sub);
        }

        /// <summary>Get all subscriptions for a customer.</summary>
        [HttpGet("customer/{customerId}")]
        public async Task<IActionResult> GetByCustomerId(string customerId)
        {
            var subs = await _service.GetByCustomerIdAsync(customerId);
            return Ok(subs);
        }

        /// <summary>Get active subscription for a customer.</summary>
        [HttpGet("customer/{customerId}/active")]
        public async Task<IActionResult> GetActive(string customerId)
        {
            var sub = await _service.GetActiveByCustomerIdAsync(customerId);
            if (sub == null) return NotFound("No active subscription found.");
            return Ok(sub);
        }

        /// <summary>Swap a meal in the rotation.</summary>
        [HttpPatch("{id}/swap")]
        public async Task<IActionResult> SwapMeal(Guid id, [FromBody] SwapMealDto dto)
        {
            var result = await _service.SwapMealAsync(id, dto);
            if (result == null) return NotFound();
            return Ok(result);
        }

        /// <summary>Reorder meals in the rotation.</summary>
        [HttpPatch("{id}/reorder")]
        public async Task<IActionResult> ReorderMeals(Guid id, [FromBody] ReorderMealsDto dto)
        {
            var result = await _service.ReorderMealsAsync(id, dto);
            if (result == null) return NotFound();
            return Ok(result);
        }

        /// <summary>Add a meal to the rotation pool.</summary>
        [HttpPost("{id}/pool")]
        public async Task<IActionResult> AddToPool(Guid id, [FromBody] AddMealToPoolDto dto)
        {
            var result = await _service.AddMealToPoolAsync(id, dto);
            if (result == null) return NotFound();
            return Ok(result);
        }

        /// <summary>Remove a meal from the rotation pool.</summary>
        [HttpDelete("{id}/pool/{mealId}")]
        public async Task<IActionResult> RemoveFromPool(Guid id, Guid mealId)
        {
            var result = await _service.RemoveMealFromPoolAsync(id, mealId);
            if (result == null) return NotFound();
            return Ok(result);
        }

        /// <summary>Skip a specific day (one-time). Extends plan by 1 day.</summary>
        [HttpPost("{id}/skip")]
        public async Task<IActionResult> SkipDay(Guid id, [FromBody] SkipDayDto dto)
        {
            var result = await _service.SkipDayAsync(id, dto);
            if (result == null) return NotFound();
            return Ok(result);
        }

        /// <summary>Undo a skip. Shrinks plan by 1 day.</summary>
        [HttpDelete("{id}/skip")]
        public async Task<IActionResult> UnskipDay(Guid id, [FromBody] SkipDayDto dto)
        {
            var result = await _service.UnskipDayAsync(id, dto);
            if (result == null) return NotFound();
            return Ok(result);
        }

        /// <summary>Pause a specific day. Extends plan by 1 day.</summary>
        [HttpPost("{id}/pause")]
        public async Task<IActionResult> PauseDay(Guid id, [FromBody] PauseDayDto dto)
        {
            var result = await _service.PauseDayAsync(id, dto);
            if (result == null) return NotFound();
            return Ok(result);
        }

        /// <summary>Unpause a specific day. Shrinks plan by 1 day.</summary>
        [HttpDelete("{id}/pause")]
        public async Task<IActionResult> UnpauseDay(Guid id, [FromBody] PauseDayDto dto)
        {
            var result = await _service.UnpauseDayAsync(id, dto);
            if (result == null) return NotFound();
            return Ok(result);
        }

        /// <summary>Get upcoming schedule (next N days).</summary>
        [HttpGet("{id}/schedule")]
        public async Task<IActionResult> GetSchedule(Guid id, [FromQuery] int days = 7)
        {
            var schedule = await _service.GetScheduleAsync(id, days);
            if (schedule == null || schedule.Count == 0) return NotFound();
            return Ok(schedule);
        }

        /// <summary>Pause the entire subscription plan.</summary>
        [HttpPost("{id}/pause-plan")]
        public async Task<IActionResult> PauseSubscription(Guid id)
        {
            var result = await _service.PauseSubscriptionAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        /// <summary>Resume the entire subscription plan.</summary>
        [HttpPost("{id}/resume-plan")]
        public async Task<IActionResult> ResumeSubscription(Guid id)
        {
            var result = await _service.ResumeSubscriptionAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        /// <summary>Cancel the subscription and refund remaining balance to customer's wallet.</summary>
        [HttpPost("{id}/cancel")]
        public async Task<IActionResult> CancelSubscription(Guid id)
        {
            var result = await _service.CancelSubscriptionAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }
    }
}
