using MealMate.Api.Models;
using MealMate.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace MealMate.Api.Repositories
{
    public interface IMealRepository
    {
        Task<IEnumerable<Meal>> GetAllAsync(string? category);
        Task<IEnumerable<Meal>> GetByAgentIdAsync(Guid agentId);
        Task<Meal?> GetByIdAsync(Guid id);
        Task<Meal> AddAsync(Meal meal);
        Task UpdateAsync(Meal meal);
        Task DeleteAsync(Guid id);
    }

    public class MealRepository : IMealRepository
    {
        private readonly AppDbContext _context;

        public MealRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Meal>> GetAllAsync(string? category)
        {
            var query = _context.Meals.AsQueryable();
            if (!string.IsNullOrEmpty(category))
            {
                query = query.Where(m => m.Category == category);
            }
            return await query.ToListAsync();
        }

        public async Task<IEnumerable<Meal>> GetByAgentIdAsync(Guid agentId)
        {
            return await _context.Meals.Where(m => m.AgentId == agentId).ToListAsync();
        }

        public async Task<Meal?> GetByIdAsync(Guid id)
        {
            return await _context.Meals.FindAsync(id);
        }

        public async Task<Meal> AddAsync(Meal meal)
        {
            _context.Meals.Add(meal);
            await _context.SaveChangesAsync();
            return meal;
        }

        public async Task UpdateAsync(Meal meal)
        {
            _context.Entry(meal).State = EntityState.Modified;
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            var meal = await _context.Meals.FindAsync(id);
            if (meal != null)
            {
                _context.Meals.Remove(meal);
                await _context.SaveChangesAsync();
            }
        }
    }
}
