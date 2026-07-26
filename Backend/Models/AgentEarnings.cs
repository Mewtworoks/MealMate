using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MealMate.Api.Models
{
    /// <summary>
    /// Tracks advance salary taken by an agent/chef and the daily deduction schedule.
    /// </summary>
    public class AgentAdvance
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid AgentId { get; set; }
        [ForeignKey("AgentId")]
        public User? Agent { get; set; }

        /// <summary>Total advance amount taken by the agent.</summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal AdvanceTaken { get; set; }

        /// <summary>Amount deducted from earnings per day.</summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal DailyDeduction { get; set; } = 100;

        /// <summary>Total amount already deducted so far.</summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalDeducted { get; set; }

        /// <summary>Whether this advance has been fully repaid.</summary>
        public bool IsFullyRepaid { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Records a payout/withdrawal request from an agent.
    /// </summary>
    public class AgentPayout
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid AgentId { get; set; }
        [ForeignKey("AgentId")]
        public User? Agent { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        /// <summary>Pending, Processed, Rejected</summary>
        public string Status { get; set; } = "Pending";

        public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ProcessedAt { get; set; }
    }
}
