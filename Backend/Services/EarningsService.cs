using MealMate.Api.Data;
using MealMate.Api.DTOs;
using MealMate.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace MealMate.Api.Services
{
    public interface IEarningsService
    {
        Task<EarningsSummaryDto> GetEarningsSummaryAsync(Guid agentId);
        Task<WithdrawResponseDto> RequestWithdrawalAsync(Guid agentId, decimal amount);
    }

    public class EarningsService : IEarningsService
    {
        private readonly AppDbContext _context;

        public EarningsService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<EarningsSummaryDto> GetEarningsSummaryAsync(Guid agentId)
        {
            var now = DateTime.UtcNow;
            var todayStart = now.Date;

            // Monday-based week start
            var dayOfWeek = (int)now.DayOfWeek;
            var mondayOffset = dayOfWeek == 0 ? 6 : dayOfWeek - 1;
            var weekStart = now.Date.AddDays(-mondayOffset);

            var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            // Get all delivered orders for this agent
            var deliveredOrders = await _context.Orders
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Meal)
                .Include(o => o.Customer)
                .Where(o => o.AgentId == agentId && o.Status == "Delivered")
                .OrderByDescending(o => o.OrderDate)
                .ToListAsync();

            // === Time-filtered calculations ===
            var todayOrders = deliveredOrders.Where(o => o.OrderDate >= todayStart).ToList();
            var weekOrders = deliveredOrders.Where(o => o.OrderDate >= weekStart).ToList();
            var monthOrders = deliveredOrders.Where(o => o.OrderDate >= monthStart).ToList();

            var todaysEarnings = todayOrders.Sum(o => o.TotalAmount);
            var weekEarnings = weekOrders.Sum(o => o.TotalAmount);
            var monthEarnings = monthOrders.Sum(o => o.TotalAmount);

            // === Weekly chart (Mon-Sun) ===
            var dayNames = new[] { "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun" };
            var todayDayIndex = dayOfWeek == 0 ? 6 : dayOfWeek - 1;
            var weeklyChart = new List<DailyEarningDto>();

            for (int i = 0; i < 7; i++)
            {
                var dayDate = weekStart.AddDays(i);
                var dayEnd = dayDate.AddDays(1);
                var dayTotal = deliveredOrders
                    .Where(o => o.OrderDate >= dayDate && o.OrderDate < dayEnd)
                    .Sum(o => o.TotalAmount);
                var isToday = i == todayDayIndex;

                weeklyChart.Add(new DailyEarningDto
                {
                    Day = isToday ? "Today" : dayNames[i],
                    Amount = dayTotal,
                    IsToday = isToday
                });
            }

            // === Advance deduction ===
            var activeAdvance = await _context.AgentAdvances
                .Where(a => a.AgentId == agentId && !a.IsFullyRepaid)
                .OrderByDescending(a => a.CreatedAt)
                .FirstOrDefaultAsync();

            AdvanceDeductionDto? advanceDto = null;
            decimal totalAdvanceDeducted = 0;

            if (activeAdvance != null)
            {
                var remaining = activeAdvance.AdvanceTaken - activeAdvance.TotalDeducted;
                var daysLeft = activeAdvance.DailyDeduction > 0
                    ? (int)Math.Ceiling(remaining / activeAdvance.DailyDeduction)
                    : 0;

                totalAdvanceDeducted = activeAdvance.TotalDeducted;

                advanceDto = new AdvanceDeductionDto
                {
                    AdvanceTaken = activeAdvance.AdvanceTaken,
                    DailyDeduction = activeAdvance.DailyDeduction,
                    DeductionDaysLeft = daysLeft,
                    Remaining = remaining,
                    TotalDeducted = activeAdvance.TotalDeducted
                };
            }

            // === Pending payout ===
            var pendingPayout = weekEarnings - totalAdvanceDeducted;
            if (pendingPayout < 0) pendingPayout = 0;

            // === Recent orders (top 10) ===
            var recentOrders = deliveredOrders.Take(10).Select(o =>
            {
                var firstItem = o.OrderItems.FirstOrDefault();
                return new RecentEarningOrderDto
                {
                    Id = o.Id.ToString(),
                    MealName = firstItem?.Meal?.Name ?? "Meal Order",
                    MealImage = firstItem?.Meal?.ImageUrl ?? "assets/onboarding/dal_chawal.png",
                    CustomerName = o.Customer?.FullName ?? "Customer",
                    Earnings = o.TotalAmount,
                    OrderDate = o.OrderDate
                };
            }).ToList();

            // === Monthly summary ===
            var monthlyNetPayout = monthEarnings - totalAdvanceDeducted;
            if (monthlyNetPayout < 0) monthlyNetPayout = 0;

            // === Hero card ===
            var ordersCompleted = weekOrders.Count;
            var avgPerOrder = ordersCompleted > 0 ? Math.Round(weekEarnings / ordersCompleted, 0) : 0;

            return new EarningsSummaryDto
            {
                TodaysEarnings = todaysEarnings,
                TodaysOrders = todayOrders.Count,
                WeekEarnings = weekEarnings,
                WeekOrders = weekOrders.Count,
                MonthEarnings = monthEarnings,
                MonthOrders = monthOrders.Count,
                TotalEarned = weekEarnings,
                OrdersCompleted = ordersCompleted,
                AvgPerOrder = avgPerOrder,
                WeeklyChart = weeklyChart,
                AdvanceDeduction = advanceDto,
                PendingPayout = pendingPayout,
                MonthlyTotalEarned = monthEarnings,
                MonthlyDeductions = totalAdvanceDeducted,
                MonthlyNetPayout = monthlyNetPayout,
                MonthlyOrdersCompleted = monthOrders.Count,
                RecentOrders = recentOrders
            };
        }

        public async Task<WithdrawResponseDto> RequestWithdrawalAsync(Guid agentId, decimal amount)
        {
            if (amount <= 0)
            {
                return new WithdrawResponseDto
                {
                    Success = false,
                    Message = "Withdrawal amount must be greater than zero."
                };
            }

            // Verify agent exists
            var agent = await _context.Users.FindAsync(agentId);
            if (agent == null)
            {
                return new WithdrawResponseDto
                {
                    Success = false,
                    Message = "Agent not found."
                };
            }

            // Create payout record
            var payout = new AgentPayout
            {
                AgentId = agentId,
                Amount = amount,
                Status = "Pending",
                RequestedAt = DateTime.UtcNow
            };

            _context.AgentPayouts.Add(payout);
            await _context.SaveChangesAsync();

            return new WithdrawResponseDto
            {
                Success = true,
                Message = $"₹{amount:N0} withdrawal requested! You'll receive it within 24 hours.",
                PayoutId = payout.Id
            };
        }
    }
}
