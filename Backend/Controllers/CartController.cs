using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MealMate.Api.Data;
using MealMate.Api.Models;

namespace MealMate.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CartController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CartController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("{userId}")]
        public async Task<IActionResult> GetCart(Guid userId)
        {
            var items = await _context.CartItems
                .Include(c => c.Meal)
                .Where(c => c.CustomerId == userId)
                .ToListAsync();
            return Ok(items);
        }

        [HttpPost("{userId}/sync")]
        public async Task<IActionResult> SyncCart(Guid userId, [FromBody] List<CartItemDto> cartDto)
        {
            // Clear existing cart
            var existingItems = await _context.CartItems.Where(c => c.CustomerId == userId).ToListAsync();
            _context.CartItems.RemoveRange(existingItems);

            // Add new ones
            foreach (var item in cartDto)
            {
                _context.CartItems.Add(new CartItem
                {
                    CustomerId = userId,
                    MealId = item.MealId,
                    Quantity = item.Quantity,
                    Total = item.Total
                });
            }

            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        [HttpDelete("{userId}")]
        public async Task<IActionResult> ClearCart(Guid userId)
        {
            var existingItems = await _context.CartItems.Where(c => c.CustomerId == userId).ToListAsync();
            _context.CartItems.RemoveRange(existingItems);
            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }
    }

    public class CartItemDto
    {
        public Guid MealId { get; set; }
        public int Quantity { get; set; }
        public decimal Total { get; set; }
    }
}
