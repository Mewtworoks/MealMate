using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MealMate.Api.Models
{
    /// <summary>
    /// Represents a customer's meal subscription plan.
    /// </summary>
    public class Subscription
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid CustomerId { get; set; }
        [ForeignKey("CustomerId")]
        public User? Customer { get; set; }

        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }

        public int Months { get; set; }

        /// <summary>Active, Paused, Expired, Cancelled</summary>
        public string Status { get; set; } = "Active";

        public int TotalDays { get; set; }
        public int CurrentDay { get; set; } = 1;

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalPaid { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal DailyDeduction { get; set; }

        public string? PlanName { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public ICollection<SubscriptionRotationMeal> RotationMeals { get; set; } = new List<SubscriptionRotationMeal>();
        public ICollection<SubscriptionSkippedDay> SkippedDays { get; set; } = new List<SubscriptionSkippedDay>();
        public ICollection<SubscriptionPausedDay> PausedDays { get; set; } = new List<SubscriptionPausedDay>();
    }

    /// <summary>
    /// A meal in a subscription's rotation pool, with its position order.
    /// </summary>
    public class SubscriptionRotationMeal
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid SubscriptionId { get; set; }
        [ForeignKey("SubscriptionId")]
        public Subscription? Subscription { get; set; }

        [Required]
        public Guid MealId { get; set; }
        [ForeignKey("MealId")]
        public Meal? Meal { get; set; }

        /// <summary>0-based position in the rotation order.</summary>
        public int Position { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal PriceAtSubscription { get; set; }
    }

    /// <summary>
    /// Tracks a one-time skip for a specific date.
    /// </summary>
    public class SubscriptionSkippedDay
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid SubscriptionId { get; set; }
        [ForeignKey("SubscriptionId")]
        public Subscription? Subscription { get; set; }

        /// <summary>The date that is skipped (date only, no time).</summary>
        public DateTime SkippedDate { get; set; }
    }

    /// <summary>
    /// Tracks a paused day for a specific date.
    /// </summary>
    public class SubscriptionPausedDay
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid SubscriptionId { get; set; }
        [ForeignKey("SubscriptionId")]
        public Subscription? Subscription { get; set; }

        /// <summary>The date that is paused (date only, no time).</summary>
        public DateTime PausedDate { get; set; }
    }
}
