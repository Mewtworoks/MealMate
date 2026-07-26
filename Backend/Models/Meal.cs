using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MealMate.Api.Models
{
    public class Meal
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; } = string.Empty;

        [Column(TypeName = "decimal(18,2)")]
        public decimal Price { get; set; }

        public string? Category { get; set; } = string.Empty;

        public string? ImageUrl { get; set; } = string.Empty;

        public bool IsVeg { get; set; }

        public bool IsAvailable { get; set; } = true;

        [Required]
        public Guid AgentId { get; set; }

        [ForeignKey("AgentId")]
        public User? Agent { get; set; }

        // ── Nutrition & detail fields ──
        public int Calories { get; set; }
        public int Protein { get; set; }       // grams
        public int Carbs { get; set; }         // grams
        public int Fat { get; set; }           // grams
        public int Fiber { get; set; }         // grams
        public string? SpiceLevel { get; set; } = "Medium";   // Mild | Medium | Hot
        public string? PrepTime { get; set; } = "25 min";
        public string? PortionSize { get; set; } = "350g";
        public string? Ingredients { get; set; } = string.Empty;  // comma-separated
        public string? Allergens { get; set; } = string.Empty;    // comma-separated
    }
}
