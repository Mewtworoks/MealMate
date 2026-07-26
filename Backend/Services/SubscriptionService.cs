using MealMate.Api.Models;
using MealMate.Api.Repositories;
using MealMate.Api.DTOs;
using MealMate.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace MealMate.Api.Services
{
    public interface ISubscriptionService
    {
        Task<SubscriptionResponseDto> CreateSubscriptionAsync(CreateSubscriptionDto dto);
        Task<SubscriptionResponseDto?> GetByIdAsync(Guid id);
        Task<List<SubscriptionResponseDto>> GetByCustomerIdAsync(Guid customerId);
        Task<SubscriptionResponseDto?> GetActiveByCustomerIdAsync(Guid customerId);
        Task<SubscriptionResponseDto?> SwapMealAsync(Guid subId, SwapMealDto dto);
        Task<SubscriptionResponseDto?> ReorderMealsAsync(Guid subId, ReorderMealsDto dto);
        Task<SubscriptionResponseDto?> AddMealToPoolAsync(Guid subId, AddMealToPoolDto dto);
        Task<SubscriptionResponseDto?> RemoveMealFromPoolAsync(Guid subId, Guid mealId);
        Task<SubscriptionResponseDto?> SkipDayAsync(Guid subId, SkipDayDto dto);
        Task<SubscriptionResponseDto?> UnskipDayAsync(Guid subId, SkipDayDto dto);
        Task<SubscriptionResponseDto?> PauseDayAsync(Guid subId, PauseDayDto dto);
        Task<SubscriptionResponseDto?> UnpauseDayAsync(Guid subId, PauseDayDto dto);
        Task<List<ScheduleDayDto>> GetScheduleAsync(Guid subId, int days = 7);
        Task<SubscriptionResponseDto?> PauseSubscriptionAsync(Guid subId);
        Task<SubscriptionResponseDto?> ResumeSubscriptionAsync(Guid subId);
        Task<CancelSubscriptionResponseDto?> CancelSubscriptionAsync(Guid subId);
    }

    public class SubscriptionService : ISubscriptionService
    {
        private readonly ISubscriptionRepository _repo;
        private readonly AppDbContext _context;

        public SubscriptionService(ISubscriptionRepository repo, AppDbContext context)
        {
            _repo = repo;
            _context = context;
        }

        public async Task<SubscriptionResponseDto> CreateSubscriptionAsync(CreateSubscriptionDto dto)
        {
            var totalDays = dto.Months * 30;
            var startDate = DateTime.UtcNow;
            var endDate = startDate.AddDays(totalDays);

            var sub = new Subscription
            {
                CustomerId = dto.CustomerId,
                StartDate = startDate,
                EndDate = endDate,
                Months = dto.Months,
                Status = "Active",
                TotalDays = totalDays,
                CurrentDay = 1,
                TotalPaid = dto.TotalPaid,
                DailyDeduction = dto.TotalPaid / totalDays,
                PlanName = dto.PlanName
            };

            for (int i = 0; i < dto.RotationMeals.Count; i++)
            {
                var rm = dto.RotationMeals[i];
                sub.RotationMeals.Add(new SubscriptionRotationMeal
                {
                    MealId = rm.MealId,
                    Position = i,
                    PriceAtSubscription = rm.Price
                });
            }

            var created = await _repo.AddAsync(sub);
            var full = await _repo.GetByIdAsync(created.Id);
            return MapToDto(full!);
        }

        public async Task<SubscriptionResponseDto?> GetByIdAsync(Guid id)
        {
            var sub = await _repo.GetByIdAsync(id);
            return sub == null ? null : MapToDto(sub);
        }

        public async Task<List<SubscriptionResponseDto>> GetByCustomerIdAsync(Guid customerId)
        {
            var subs = await _repo.GetByCustomerIdAsync(customerId);
            return subs.Select(MapToDto).ToList();
        }

        public async Task<SubscriptionResponseDto?> GetActiveByCustomerIdAsync(Guid customerId)
        {
            var sub = await _repo.GetActiveByCustomerIdAsync(customerId);
            return sub == null ? null : MapToDto(sub);
        }

        public async Task<SubscriptionResponseDto?> SwapMealAsync(Guid subId, SwapMealDto dto)
        {
            var sub = await _repo.GetByIdAsync(subId);
            if (sub == null) return null;

            var existing = sub.RotationMeals.FirstOrDefault(rm => rm.MealId == dto.OldMealId);
            if (existing == null) return null;

            existing.MealId = dto.NewMealId;
            existing.PriceAtSubscription = dto.NewMealPrice;

            await _repo.UpdateAsync(sub);
            var updated = await _repo.GetByIdAsync(subId);
            return MapToDto(updated!);
        }

        public async Task<SubscriptionResponseDto?> ReorderMealsAsync(Guid subId, ReorderMealsDto dto)
        {
            var sub = await _repo.GetByIdAsync(subId);
            if (sub == null) return null;

            // Update positions based on the order in the DTO
            for (int i = 0; i < dto.Meals.Count; i++)
            {
                var rm = sub.RotationMeals.FirstOrDefault(m => m.MealId == dto.Meals[i].MealId);
                if (rm != null) rm.Position = i;
            }

            await _repo.UpdateAsync(sub);
            var updated = await _repo.GetByIdAsync(subId);
            return MapToDto(updated!);
        }

        public async Task<SubscriptionResponseDto?> AddMealToPoolAsync(Guid subId, AddMealToPoolDto dto)
        {
            var sub = await _repo.GetByIdAsync(subId);
            if (sub == null) return null;

            // Don't add duplicates
            if (sub.RotationMeals.Any(rm => rm.MealId == dto.MealId)) 
            {
                return MapToDto(sub);
            }

            var nextPosition = sub.RotationMeals.Any() 
                ? sub.RotationMeals.Max(rm => rm.Position) + 1 
                : 0;

            sub.RotationMeals.Add(new SubscriptionRotationMeal
            {
                SubscriptionId = subId,
                MealId = dto.MealId,
                Position = nextPosition,
                PriceAtSubscription = dto.Price
            });

            await _repo.UpdateAsync(sub);
            var updated = await _repo.GetByIdAsync(subId);
            return MapToDto(updated!);
        }

        public async Task<SubscriptionResponseDto?> RemoveMealFromPoolAsync(Guid subId, Guid mealId)
        {
            var sub = await _repo.GetByIdAsync(subId);
            if (sub == null) return null;
            if (sub.RotationMeals.Count <= 1) return MapToDto(sub); // Must keep at least 1

            var toRemove = sub.RotationMeals.FirstOrDefault(rm => rm.MealId == mealId);
            if (toRemove != null)
            {
                _context.Set<SubscriptionRotationMeal>().Remove(toRemove);
                await _context.SaveChangesAsync();

                // Reindex positions
                var remaining = await _context.Set<SubscriptionRotationMeal>()
                    .Where(rm => rm.SubscriptionId == subId)
                    .OrderBy(rm => rm.Position)
                    .ToListAsync();
                for (int i = 0; i < remaining.Count; i++)
                    remaining[i].Position = i;
                await _context.SaveChangesAsync();
            }

            var updated = await _repo.GetByIdAsync(subId);
            return MapToDto(updated!);
        }

        public async Task<SubscriptionResponseDto?> SkipDayAsync(Guid subId, SkipDayDto dto)
        {
            var sub = await _repo.GetByIdAsync(subId);
            if (sub == null) return null;

            var date = DateTime.Parse(dto.DateStr).Date;
            if (sub.SkippedDays.Any(sd => sd.SkippedDate.Date == date)) return MapToDto(sub);

            sub.SkippedDays.Add(new SubscriptionSkippedDay
            {
                SubscriptionId = subId,
                SkippedDate = date
            });

            // Extend end date by 1 day
            sub.EndDate = sub.EndDate.AddDays(1);
            sub.TotalDays += 1;

            await _repo.UpdateAsync(sub);
            return MapToDto(sub);
        }

        public async Task<SubscriptionResponseDto?> UnskipDayAsync(Guid subId, SkipDayDto dto)
        {
            var sub = await _repo.GetByIdAsync(subId);
            if (sub == null) return null;

            var date = DateTime.Parse(dto.DateStr).Date;
            var existing = sub.SkippedDays.FirstOrDefault(sd => sd.SkippedDate.Date == date);
            if (existing != null)
            {
                _context.Set<SubscriptionSkippedDay>().Remove(existing);
                sub.EndDate = sub.EndDate.AddDays(-1);
                sub.TotalDays -= 1;
                await _context.SaveChangesAsync();
            }

            var updated = await _repo.GetByIdAsync(subId);
            return MapToDto(updated!);
        }

        public async Task<SubscriptionResponseDto?> PauseDayAsync(Guid subId, PauseDayDto dto)
        {
            var sub = await _repo.GetByIdAsync(subId);
            if (sub == null) return null;

            var date = DateTime.Parse(dto.DateStr).Date;
            if (sub.PausedDays.Any(pd => pd.PausedDate.Date == date)) return MapToDto(sub);

            sub.PausedDays.Add(new SubscriptionPausedDay
            {
                SubscriptionId = subId,
                PausedDate = date
            });

            sub.EndDate = sub.EndDate.AddDays(1);
            sub.TotalDays += 1;

            await _repo.UpdateAsync(sub);
            return MapToDto(sub);
        }

        public async Task<SubscriptionResponseDto?> UnpauseDayAsync(Guid subId, PauseDayDto dto)
        {
            var sub = await _repo.GetByIdAsync(subId);
            if (sub == null) return null;

            var date = DateTime.Parse(dto.DateStr).Date;
            var existing = sub.PausedDays.FirstOrDefault(pd => pd.PausedDate.Date == date);
            if (existing != null)
            {
                _context.Set<SubscriptionPausedDay>().Remove(existing);
                sub.EndDate = sub.EndDate.AddDays(-1);
                sub.TotalDays -= 1;
                await _context.SaveChangesAsync();
            }

            var updated = await _repo.GetByIdAsync(subId);
            return MapToDto(updated!);
        }

        public async Task<List<ScheduleDayDto>> GetScheduleAsync(Guid subId, int days = 7)
        {
            var sub = await _repo.GetByIdAsync(subId);
            if (sub == null || !sub.RotationMeals.Any()) return new List<ScheduleDayDto>();

            var rotation = sub.RotationMeals.OrderBy(rm => rm.Position).ToList();
            var start = sub.StartDate.Date;
            var now = DateTime.UtcNow.Date;
            var elapsed = (int)(now - start).TotalDays;

            var schedule = new List<ScheduleDayDto>();
            for (int d = 0; d < days; d++)
            {
                var date = now.AddDays(d);
                var dateStr = date.ToString("yyyy-MM-dd");
                var mealIdx = (elapsed + d) % rotation.Count;
                var rm = rotation[mealIdx];

                schedule.Add(new ScheduleDayDto
                {
                    Date = dateStr,
                    DayName = date.ToString("ddd"),
                    DayNum = date.Day,
                    MonthStr = date.ToString("MMM"),
                    IsToday = d == 0,
                    IsSkipped = sub.SkippedDays.Any(sd => sd.SkippedDate.Date == date),
                    IsPaused = sub.PausedDays.Any(pd => pd.PausedDate.Date == date),
                    Meal = new RotationMealResponseDto
                    {
                        MealId = rm.MealId,
                        Name = rm.Meal?.Name ?? "Unknown",
                        Price = rm.PriceAtSubscription,
                        Position = rm.Position,
                        ImageUrl = rm.Meal?.ImageUrl
                    }
                });
            }

            return schedule;
        }

        public async Task<SubscriptionResponseDto?> PauseSubscriptionAsync(Guid subId)
        {
            var sub = await _repo.GetByIdAsync(subId);
            if (sub == null || sub.Status != "Active") return sub == null ? null : MapToDto(sub);

            sub.Status = "Paused";
            await _repo.UpdateAsync(sub);
            return MapToDto(sub);
        }

        public async Task<SubscriptionResponseDto?> ResumeSubscriptionAsync(Guid subId)
        {
            var sub = await _repo.GetByIdAsync(subId);
            if (sub == null || sub.Status != "Paused") return sub == null ? null : MapToDto(sub);

            sub.Status = "Active";
            await _repo.UpdateAsync(sub);
            return MapToDto(sub);
        }

        public async Task<CancelSubscriptionResponseDto?> CancelSubscriptionAsync(Guid subId)
        {
            var sub = await _repo.GetByIdAsync(subId);
            if (sub == null) return null;

            // Calculate remaining days and refund
            var now = DateTime.UtcNow.Date;
            var end = sub.EndDate.Date;
            var daysLeft = Math.Max(0, (int)(end - now).TotalDays);
            var refundAmount = daysLeft * sub.DailyDeduction;

            sub.Status = "Cancelled";
            sub.EndDate = now; // End today
            await _repo.UpdateAsync(sub);

            // Refund to wallet
            var user = await _context.Users.FindAsync(sub.CustomerId);
            if (user != null)
            {
                user.WalletBalance += refundAmount;
                await _context.SaveChangesAsync();
            }

            return new CancelSubscriptionResponseDto
            {
                Subscription = MapToDto(sub),
                RefundAmount = refundAmount,
                DaysRemaining = daysLeft
            };
        }

        // ═══════════════════════════════════════════════════
        // MAPPING
        // ═══════════════════════════════════════════════════

        private static SubscriptionResponseDto MapToDto(Subscription sub)
        {
            return new SubscriptionResponseDto
            {
                Id = sub.Id,
                CustomerId = sub.CustomerId,
                StartDate = sub.StartDate.ToString("yyyy-MM-dd"),
                EndDate = sub.EndDate.ToString("yyyy-MM-dd"),
                Months = sub.Months,
                Status = sub.Status,
                TotalDays = sub.TotalDays,
                CurrentDay = sub.CurrentDay,
                TotalPaid = sub.TotalPaid,
                DailyDeduction = sub.DailyDeduction,
                PlanName = sub.PlanName,
                RotationMeals = sub.RotationMeals
                    .OrderBy(rm => rm.Position)
                    .Select(rm => new RotationMealResponseDto
                    {
                        MealId = rm.MealId,
                        Name = rm.Meal?.Name ?? "Unknown",
                        Price = rm.PriceAtSubscription,
                        Position = rm.Position,
                        ImageUrl = rm.Meal?.ImageUrl
                    }).ToList(),
                SkippedDays = sub.SkippedDays.Select(sd => sd.SkippedDate.ToString("yyyy-MM-dd")).ToList(),
                PausedDays = sub.PausedDays.Select(pd => pd.PausedDate.ToString("yyyy-MM-dd")).ToList()
            };
        }
    }
}
