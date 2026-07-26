using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MealMate.Api.Models
{
    public class Order
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int OrderNumber { get; set; }

        [Required]
        public Guid CustomerId { get; set; }
        [ForeignKey("CustomerId")]
        public User? Customer { get; set; }

        [Required]
        public Guid AgentId { get; set; }
        [ForeignKey("AgentId")]
        public User? Agent { get; set; }

        public DateTime OrderDate { get; set; } = DateTime.UtcNow;

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalAmount { get; set; }

        public string Status { get; set; } = "Pending"; // Pending, Preparing, OutForDelivery, Delivered, Cancelled

        public string DeliveryAddress { get; set; } = string.Empty;

        public bool IsCustomMeal { get; set; } = false;
        public string CustomMealDetails { get; set; } = string.Empty;

        public string PaymentMethod { get; set; } = "COD"; // Wallet, COD

        [Column(TypeName = "decimal(18,2)")]
        public decimal WalletAmount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal CreditUsedAmount { get; set; }

        public int PointsRedeemed { get; set; }
        public int PointsEarned { get; set; }

        public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
    }

    public class OrderItem
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid OrderId { get; set; }
        [ForeignKey("OrderId")]
        public Order? Order { get; set; }

        public Guid MealId { get; set; }
        [ForeignKey("MealId")]
        public Meal? Meal { get; set; }

        public int Quantity { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal UnitPrice { get; set; }
    }
}
