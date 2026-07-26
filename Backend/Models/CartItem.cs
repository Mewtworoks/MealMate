using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MealMate.Api.Models
{
    public class CartItem
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid CustomerId { get; set; }
        [ForeignKey("CustomerId")]
        public User? Customer { get; set; }

        [Required]
        public Guid MealId { get; set; }
        [ForeignKey("MealId")]
        public Meal? Meal { get; set; }

        public int Quantity { get; set; }
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal Total { get; set; }
    }
}
