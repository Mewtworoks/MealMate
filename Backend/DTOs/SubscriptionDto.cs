namespace MealMate.Api.DTOs
{
    // ═══════════════════════════════════════════════════
    // REQUEST DTOs
    // ═══════════════════════════════════════════════════

    public class CreateSubscriptionDto
    {
        public string? CustomerId { get; set; } = string.Empty;
        public int Months { get; set; }
        public decimal TotalPaid { get; set; }
        public string? PlanName { get; set; }
        public List<RotationMealDto> RotationMeals { get; set; } = new();
    }

    public class RotationMealDto
    {
        public Guid MealId { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
    }

    public class SwapMealDto
    {
        public Guid OldMealId { get; set; }
        public Guid NewMealId { get; set; }
        public string NewMealName { get; set; } = string.Empty;
        public decimal NewMealPrice { get; set; }
    }

    public class ReorderMealsDto
    {
        public List<RotationMealDto> Meals { get; set; } = new();
    }

    public class AddMealToPoolDto
    {
        public Guid MealId { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
    }

    public class SkipDayDto
    {
        public string DateStr { get; set; } = string.Empty; // yyyy-MM-dd
    }

    public class PauseDayDto
    {
        public string DateStr { get; set; } = string.Empty; // yyyy-MM-dd
    }

    // ═══════════════════════════════════════════════════
    // RESPONSE DTOs
    // ═══════════════════════════════════════════════════

    public class SubscriptionResponseDto
    {
        public Guid Id { get; set; }
        public string CustomerId { get; set; } = string.Empty;
        public string StartDate { get; set; } = string.Empty;
        public string EndDate { get; set; } = string.Empty;
        public int Months { get; set; }
        public string Status { get; set; } = string.Empty;
        public int TotalDays { get; set; }
        public int CurrentDay { get; set; }
        public decimal TotalPaid { get; set; }
        public decimal DailyDeduction { get; set; }
        public string? PlanName { get; set; }
        public List<RotationMealResponseDto> RotationMeals { get; set; } = new();
        public List<string> SkippedDays { get; set; } = new();
        public List<string> PausedDays { get; set; } = new();
    }

    public class RotationMealResponseDto
    {
        public Guid MealId { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int Position { get; set; }
        public string? ImageUrl { get; set; }
    }

    public class ScheduleDayDto
    {
        public string Date { get; set; } = string.Empty;
        public string DayName { get; set; } = string.Empty;
        public int DayNum { get; set; }
        public string MonthStr { get; set; } = string.Empty;
        public bool IsToday { get; set; }
        public bool IsSkipped { get; set; }
        public bool IsPaused { get; set; }
        public RotationMealResponseDto Meal { get; set; } = new();
    }

    public class CancelSubscriptionResponseDto
    {
        public SubscriptionResponseDto Subscription { get; set; } = new();
        public decimal RefundAmount { get; set; }
        public int DaysRemaining { get; set; }
    }
}
