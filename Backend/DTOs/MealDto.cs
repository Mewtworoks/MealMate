namespace MealMate.Api.DTOs
{
    public class MealRequestDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public string? Category { get; set; } = string.Empty;
        public string? ImageUrl { get; set; } = string.Empty;
        public bool IsVeg { get; set; }
        public bool IsAvailable { get; set; } = true;
        public string? AgentId { get; set; } = string.Empty;

        // ── Nutrition & detail fields ──
        public int Calories { get; set; }
        public int Protein { get; set; }
        public int Carbs { get; set; }
        public int Fat { get; set; }
        public int Fiber { get; set; }
        public string? SpiceLevel { get; set; } = "Medium";
        public string? PrepTime { get; set; } = "25 min";
        public string? PortionSize { get; set; } = "350g";
        public string? Ingredients { get; set; } = string.Empty;
        public string? Allergens { get; set; } = string.Empty;
    }

    public class MealResponseDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public string? Category { get; set; } = string.Empty;
        public string? ImageUrl { get; set; } = string.Empty;
        public bool IsVeg { get; set; }
        public bool IsAvailable { get; set; }
        public Guid AgentId { get; set; }

        // ── Nutrition & detail fields ──
        public int Calories { get; set; }
        public int Protein { get; set; }
        public int Carbs { get; set; }
        public int Fat { get; set; }
        public int Fiber { get; set; }
        public string? SpiceLevel { get; set; } = string.Empty;
        public string? PrepTime { get; set; } = string.Empty;
        public string? PortionSize { get; set; } = string.Empty;
        public string? Ingredients { get; set; } = string.Empty;
        public string? Allergens { get; set; } = string.Empty;
    }
}
