using Microsoft.AspNetCore.Mvc;
using MealMate.Api.Services;
using MealMate.Api.DTOs;

namespace MealMate.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MealsController : ControllerBase
    {
        private readonly IMealService _mealService;

        public MealsController(IMealService mealService)
        {
            _mealService = mealService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? category)
        {
            var meals = await _mealService.GetAllAsync(category);
            return Ok(meals);
        }

        [HttpGet("agent/{agentId}")]
        public async Task<IActionResult> GetByAgent(Guid agentId)
        {
            var meals = await _mealService.GetByAgentIdAsync(agentId);
            return Ok(meals);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var meal = await _mealService.GetByIdAsync(id);
            if (meal == null) return NotFound();
            return Ok(meal);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] MealRequestDto mealRequest)
        {
            var result = await _mealService.CreateAsync(mealRequest);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] MealRequestDto mealRequest)
        {
            var success = await _mealService.UpdateAsync(id, mealRequest);
            if (!success) return NotFound();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var success = await _mealService.DeleteAsync(id);
            if (!success) return NotFound();
            return NoContent();
        }
    }
}
