using MealMate.Api.Models;
using MealMate.Api.Repositories;
using MealMate.Api.DTOs;
using MealMate.Api.Data;
using Microsoft.EntityFrameworkCore;
using AutoMapper;

namespace MealMate.Api.Services
{
    public interface IMealService
    {
        Task<IEnumerable<MealResponseDto>> GetAllAsync(string? category);
        Task<IEnumerable<MealResponseDto>> GetByAgentIdAsync(string agentId);
        Task<MealResponseDto?> GetByIdAsync(Guid id);
        Task<MealResponseDto> CreateAsync(MealRequestDto mealRequest);
        Task<bool> UpdateAsync(Guid id, MealRequestDto mealRequest);
        Task<bool> DeleteAsync(Guid id);
    }

    public class MealService : IMealService
    {
        private readonly IMealRepository _mealRepository;
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;

        public MealService(IMealRepository mealRepository, AppDbContext context, IMapper mapper)
        {
            _mealRepository = mealRepository;
            _context = context;
            _mapper = mapper;
        }

        public async Task<IEnumerable<MealResponseDto>> GetAllAsync(string? category)
        {
            var meals = await _mealRepository.GetAllAsync(category);
            return _mapper.Map<IEnumerable<MealResponseDto>>(meals);
        }

        public async Task<IEnumerable<MealResponseDto>> GetByAgentIdAsync(string agentId)
        {
            var agentGuid = await ResolveAgentGuidAsync(agentId);
            var meals = await _mealRepository.GetByAgentIdAsync(agentGuid);
            return _mapper.Map<IEnumerable<MealResponseDto>>(meals);
        }

        public async Task<MealResponseDto?> GetByIdAsync(Guid id)
        {
            var meal = await _mealRepository.GetByIdAsync(id);
            return _mapper.Map<MealResponseDto>(meal);
        }

        public async Task<MealResponseDto> CreateAsync(MealRequestDto mealRequest)
        {
            var meal = _mapper.Map<Meal>(mealRequest);
            meal.AgentId = await ResolveAgentGuidAsync(mealRequest.AgentId);

            var result = await _mealRepository.AddAsync(meal);
            return _mapper.Map<MealResponseDto>(result);
        }

        public async Task<bool> UpdateAsync(Guid id, MealRequestDto mealRequest)
        {
            var existingMeal = await _mealRepository.GetByIdAsync(id);
            if (existingMeal == null) return false;

            _mapper.Map(mealRequest, existingMeal);
            existingMeal.AgentId = await ResolveAgentGuidAsync(mealRequest.AgentId);

            await _mealRepository.UpdateAsync(existingMeal);
            return true;
        }

        private async Task<Guid> ResolveAgentGuidAsync(string? agentIdInput)
        {
            if (!string.IsNullOrWhiteSpace(agentIdInput))
            {
                var inputClean = agentIdInput.Trim();

                if (Guid.TryParse(inputClean, out Guid parsedGuid))
                {
                    var userByGuid = await _context.Users.FindAsync(parsedGuid);
                    if (userByGuid != null) return userByGuid.Id;
                }

                var userByEmail = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == inputClean.ToLower());
                if (userByEmail != null) return userByEmail.Id;
            }

            var agentUser = await _context.Users.FirstOrDefaultAsync(u => u.Role == "Agent")
                ?? await _context.Users.FirstOrDefaultAsync();

            if (agentUser != null) return agentUser.Id;

            // If no user exists, create a default Agent system user record to preserve database integrity
            var fallbackId = Guid.NewGuid();
            var systemAgent = new User
            {
                Id = fallbackId,
                Email = "agent@mealmate.com",
                FullName = "MealMate Chef",
                Role = "Agent",
                CreatedAt = DateTime.UtcNow
            };
            _context.Users.Add(systemAgent);
            await _context.SaveChangesAsync();
            return fallbackId;
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var existingMeal = await _mealRepository.GetByIdAsync(id);
            if (existingMeal == null) return false;

            await _mealRepository.DeleteAsync(id);
            return true;
        }
    }
}
