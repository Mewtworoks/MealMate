namespace MealMate.Api.DTOs
{
    public class UserResponseDto
    {
        public Guid Id { get; set; }
        public string? Email { get; set; }
        public string? FullName { get; set; }
        public string? PhoneNumber { get; set; }
        public string Role { get; set; } = string.Empty;
        public decimal WalletBalance { get; set; }
        public decimal CreditLimit { get; set; }
        public decimal CreditUsed { get; set; }
        public int LoyaltyPoints { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class GoogleLoginDto
    {
        public string IdToken { get; set; } = string.Empty;
        public string Role { get; set; } = "Customer";
    }

    public class EmailLoginDto
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Role { get; set; } = "Customer";
    }

    public class RegisterDto
    {
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string Role { get; set; } = "Customer";
    }
}
