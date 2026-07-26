namespace MealMate.Api.DTOs
{
    /// <summary>
    /// Full earnings summary returned to the frontend.
    /// </summary>
    public class EarningsSummaryDto
    {
        // Today
        public decimal TodaysEarnings { get; set; }
        public int TodaysOrders { get; set; }

        // This week
        public decimal WeekEarnings { get; set; }
        public int WeekOrders { get; set; }

        // This month
        public decimal MonthEarnings { get; set; }
        public int MonthOrders { get; set; }

        // Hero card
        public decimal TotalEarned { get; set; }
        public int OrdersCompleted { get; set; }
        public decimal AvgPerOrder { get; set; }

        // Weekly chart (Mon-Sun)
        public List<DailyEarningDto> WeeklyChart { get; set; } = new();

        // Advance deduction
        public AdvanceDeductionDto? AdvanceDeduction { get; set; }

        // Pending payout
        public decimal PendingPayout { get; set; }

        // Monthly summary
        public decimal MonthlyTotalEarned { get; set; }
        public decimal MonthlyDeductions { get; set; }
        public decimal MonthlyNetPayout { get; set; }
        public int MonthlyOrdersCompleted { get; set; }

        // Recent delivered orders
        public List<RecentEarningOrderDto> RecentOrders { get; set; } = new();
    }

    public class DailyEarningDto
    {
        public string Day { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public bool IsToday { get; set; }
    }

    public class AdvanceDeductionDto
    {
        public decimal AdvanceTaken { get; set; }
        public decimal DailyDeduction { get; set; }
        public int DeductionDaysLeft { get; set; }
        public decimal Remaining { get; set; }
        public decimal TotalDeducted { get; set; }
    }

    public class RecentEarningOrderDto
    {
        public string Id { get; set; } = string.Empty;
        public string MealName { get; set; } = string.Empty;
        public string MealImage { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public decimal Earnings { get; set; }
        public DateTime OrderDate { get; set; }
    }

    public class WithdrawRequestDto
    {
        public decimal Amount { get; set; }
    }

    public class WithdrawResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public Guid? PayoutId { get; set; }
    }
}
