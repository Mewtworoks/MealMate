using Microsoft.AspNetCore.Mvc;
using MealMate.Api.Services;
using MealMate.Api.DTOs;

namespace MealMate.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OrdersController : ControllerBase
    {
        private readonly IOrderService _orderService;

        public OrdersController(IOrderService orderService)
        {
            _orderService = orderService;
        }

        [HttpPost]
        public async Task<IActionResult> PlaceOrder([FromBody] OrderRequestDto orderRequest)
        {
            try
            {
                var result = await _orderService.PlaceOrderAsync(orderRequest);
                return Ok(result);
            }
            catch (Exception ex)
            {
                var innerMsg = ex.InnerException?.Message ?? "";
                return StatusCode(500, $"Internal server error: {ex.Message}. Inner: {innerMsg}");
            }
        }

        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetCustomerOrders(string userId)
        {
            if (Guid.TryParse(userId, out var guid))
            {
                var orders = await _orderService.GetCustomerOrdersAsync(guid);
                return Ok(orders);
            }
            return Ok(new List<object>());
        }

        [HttpGet("agent-orders/{agentId}")]
        public async Task<IActionResult> GetAgentOrders(string agentId)
        {
            if (Guid.TryParse(agentId, out var guid))
            {
                var orders = await _orderService.GetAgentOrdersAsync(guid);
                return Ok(orders);
            }
            return Ok(new List<object>());
        }

        [HttpPatch("{id}/status")]
        public async Task<IActionResult> UpdateStatus(string id, [FromBody] string status)
        {
            var success = await _orderService.UpdateOrderStatusAsync(id, status);
            if (!success) return NotFound();
            return NoContent();
        }
    }
}
