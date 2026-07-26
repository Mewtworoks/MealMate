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
        public async Task<IActionResult> GetCustomerOrders(Guid userId)
        {
            var orders = await _orderService.GetCustomerOrdersAsync(userId);
            return Ok(orders);
        }

        [HttpGet("agent-orders/{agentId}")]
        public async Task<IActionResult> GetAgentOrders(Guid agentId)
        {
            var orders = await _orderService.GetAgentOrdersAsync(agentId);
            return Ok(orders);
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
