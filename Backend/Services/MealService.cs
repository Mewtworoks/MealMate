using MealMate.Api.Models;
using MealMate.Api.Repositories;
using MealMate.Api.DTOs;
using AutoMapper;

namespace MealMate.Api.Services
{
    public interface IMealService
    {
        Task<IEnumerable<MealResponseDto>> GetAllAsync(string? category);
        Task<IEnumerable<MealResponseDto>> GetByAgentIdAsync(Guid agentId);
        Task<MealResponseDto?> GetByIdAsync(Guid id);
        Task<MealResponseDto> CreateAsync(MealRequestDto mealRequest);
        Task<bool> UpdateAsync(Guid id, MealRequestDto mealRequest);
        Task<bool> DeleteAsync(Guid id);
    }

    public class MealService : IMealService
    {
        private readonly IMealRepository _mealRepository;
        private readonly IMapper _mapper;

        public MealService(IMealRepository mealRepository, IMapper mapper)
        {
            _mealRepository = mealRepository;
            _mapper = mapper;
        }

        public async Task<IEnumerable<MealResponseDto>> GetAllAsync(string? category)
        {
            var meals = await _mealRepository.GetAllAsync(category);
            return _mapper.Map<IEnumerable<MealResponseDto>>(meals);
        }

        public async Task<IEnumerable<MealResponseDto>> GetByAgentIdAsync(Guid agentId)
        {
            var meals = await _mealRepository.GetByAgentIdAsync(agentId);
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
            var result = await _mealRepository.AddAsync(meal);
            return _mapper.Map<MealResponseDto>(result);
        }

        public async Task<bool> UpdateAsync(Guid id, MealRequestDto mealRequest)
        {
            var existingMeal = await _mealRepository.GetByIdAsync(id);
            if (existingMeal == null) return false;

            _mapper.Map(mealRequest, existingMeal);
            await _mealRepository.UpdateAsync(existingMeal);
            return true;
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
