using MealMate.Api.Models;
using MealMate.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace MealMate.Api.Repositories
{
    public interface ISubscriptionRepository
    {
        Task<Subscription> AddAsync(Subscription subscription);
        Task<Subscription?> GetByIdAsync(Guid id);
        Task<List<Subscription>> GetByCustomerIdAsync(Guid customerId);
        Task<Subscription?> GetActiveByCustomerIdAsync(Guid customerId);
        Task UpdateAsync(Subscription subscription);
    }

    public class SubscriptionRepository : ISubscriptionRepository
    {
        private readonly AppDbContext _context;

        public SubscriptionRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Subscription> AddAsync(Subscription subscription)
        {
            _context.Subscriptions.Add(subscription);
            await _context.SaveChangesAsync();
            return subscription;
        }

        public async Task<Subscription?> GetByIdAsync(Guid id)
        {
            return await _context.Subscriptions
                .Include(s => s.RotationMeals)
                    .ThenInclude(rm => rm.Meal)
                .Include(s => s.SkippedDays)
                .Include(s => s.PausedDays)
                .FirstOrDefaultAsync(s => s.Id == id);
        }

        public async Task<List<Subscription>> GetByCustomerIdAsync(Guid customerId)
        {
            return await _context.Subscriptions
                .Include(s => s.RotationMeals.OrderBy(rm => rm.Position))
                    .ThenInclude(rm => rm.Meal)
                .Include(s => s.SkippedDays)
                .Include(s => s.PausedDays)
                .Where(s => s.CustomerId == customerId)
                .OrderByDescending(s => s.CreatedAt)
                .ToListAsync();
        }

        public async Task<Subscription?> GetActiveByCustomerIdAsync(Guid customerId)
        {
            return await _context.Subscriptions
                .Include(s => s.RotationMeals.OrderBy(rm => rm.Position))
                    .ThenInclude(rm => rm.Meal)
                .Include(s => s.SkippedDays)
                .Include(s => s.PausedDays)
                .FirstOrDefaultAsync(s => s.CustomerId == customerId && s.Status == "Active");
        }

        public async Task UpdateAsync(Subscription subscription)
        {
            subscription.UpdatedAt = DateTime.UtcNow;
            
            var entry = _context.Entry(subscription);
            if (entry.State == EntityState.Detached)
            {
                _context.Subscriptions.Attach(subscription);
            }
            
            entry.State = EntityState.Modified;
            await _context.SaveChangesAsync();
        }
    }
}
