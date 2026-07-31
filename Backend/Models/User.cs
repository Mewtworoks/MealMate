using System.ComponentModel.DataAnnotations;

namespace MealMate.Api.Models
{
    public class User
    {
        [Key]
        public Guid Id { get; set; }

        [StringLength(100)]
        public string? Email { get; set; }

        public string? FullName { get; set; }

        [StringLength(15)]
        public string? PhoneNumber { get; set; }

        [Required]
        public string Role { get; set; } = "Customer"; // "Customer" or "Agent"

        public decimal WalletBalance { get; set; } = 2500; // Default as requested
        public decimal CreditLimit { get; set; } = 500;
        public decimal CreditUsed { get; set; } = 0;
        public int LoyaltyPoints { get; set; } = 1000;

        // ── Location & Kitchen Details ──
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public string? Address { get; set; }
        public string? KitchenName { get; set; }
        public double ServiceRadiusKm { get; set; } = 20.0;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
