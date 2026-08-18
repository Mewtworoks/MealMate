namespace MealMate.Api.DTOs
{
    public class OrderRequestDto
    {
        public string? CustomerId { get; set; } = string.Empty;
        public string? AgentId { get; set; } = string.Empty;
        public string DeliveryAddress { get; set; } = string.Empty;
        public string PaymentMethod { get; set; } = "COD"; // Wallet, COD
        public bool RedeemPoints { get; set; }
        public bool IsCustomMeal { get; set; } = false;
        public string CustomMealDetails { get; set; } = string.Empty;
        public decimal EstimatedTotal { get; set; }
        public List<OrderItemRequestDto> Items { get; set; } = new();
    }

    public class OrderItemRequestDto
    {
        public Guid MealId { get; set; }
        public int Quantity { get; set; }
    }

    public class OrderResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public string CustomerId { get; set; } = string.Empty;
        public string AgentId { get; set; } = string.Empty;
        public DateTime OrderDate { get; set; }
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = string.Empty;
        public string DeliveryAddress { get; set; } = string.Empty;
        public string PaymentMethod { get; set; } = string.Empty;
        public decimal WalletAmount { get; set; }
        public decimal CreditUsedAmount { get; set; }
        public int PointsRedeemed { get; set; }
        public int PointsEarned { get; set; }
        public bool IsCustomMeal { get; set; }
        public string CustomMealDetails { get; set; } = string.Empty;
        public List<OrderItemResponseDto> OrderItems { get; set; } = new();

        // Dynamic Info
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public double DistanceKm { get; set; }
    }

    public class OrderItemResponseDto
    {
        public Guid MealId { get; set; }
        public string MealName { get; set; } = string.Empty;
        public string ImageUrl { get; set; } = string.Empty;
        public bool IsVeg { get; set; } = true;
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
    }
}
