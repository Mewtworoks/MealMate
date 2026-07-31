using Microsoft.EntityFrameworkCore;
using MealMate.Api.Models;

namespace MealMate.Api.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Meal> Meals { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderItem> OrderItems { get; set; }
        public DbSet<CartItem> CartItems { get; set; }
        public DbSet<AgentAdvance> AgentAdvances { get; set; }
        public DbSet<AgentPayout> AgentPayouts { get; set; }
        public DbSet<Subscription> Subscriptions { get; set; }
        public DbSet<SubscriptionRotationMeal> SubscriptionRotationMeals { get; set; }
        public DbSet<SubscriptionSkippedDay> SubscriptionSkippedDays { get; set; }
        public DbSet<SubscriptionPausedDay> SubscriptionPausedDays { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.HasCharSet("utf8mb4");

            foreach (var entity in modelBuilder.Model.GetEntityTypes())
            {
                foreach (var property in entity.GetProperties())
                {
                    if (property.ClrType == typeof(Guid) || property.ClrType == typeof(Guid?))
                    {
                        property.SetCollation("utf8mb4_bin");
                    }
                }
            }

            modelBuilder.Entity<User>()
                .HasIndex(u => u.PhoneNumber)
                .IsUnique();

            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            // Seed Data
            var agentId = Guid.Parse("11111111-1111-1111-1111-111111111111");

            modelBuilder.Entity<User>().HasData(new User
            {
                Id = agentId,
                Email = "agent@mealmate.com",
                FullName = "Default Chef",
                PhoneNumber = "1234567890",
                Role = "Agent",
                Latitude = 28.6139,
                Longitude = 77.2090,
                Address = "Connaught Place, New Delhi",
                KitchenName = "Grand Central Kitchen",
                ServiceRadiusKm = 20.0,
                CreatedAt = DateTime.UtcNow
            });

            modelBuilder.Entity<Meal>().HasData(
                new Meal { Id = Guid.Parse("00000000-0000-0000-0000-000000000001"), Name = "Dal Makhani", Description = "Creamy black lentils", Price = 180, Category = "Thali", IsVeg = true, IsAvailable = true, AgentId = agentId, ImageUrl = "assets/meals/dal_makhani.jpg" },
                new Meal { Id = Guid.Parse("00000000-0000-0000-0000-000000000002"), Name = "Paneer Tikka", Description = "Grilled cottage cheese", Price = 220, Category = "Fast Food", IsVeg = true, IsAvailable = true, AgentId = agentId, ImageUrl = "assets/meals/paneer_tikka.jpg" },
                new Meal { Id = Guid.Parse("00000000-0000-0000-0000-000000000003"), Name = "Veg Pulao", Description = "Fragrant rice with vegetables", Price = 150, Category = "Thali", IsVeg = true, IsAvailable = true, AgentId = agentId, ImageUrl = "assets/meals/veg_pulao.jpg" },
                new Meal { Id = Guid.Parse("00000000-0000-0000-0000-000000000004"), Name = "Masala Dosa", Description = "Crispy crepe with potato filling", Price = 120, Category = "Fast Food", IsVeg = true, IsAvailable = true, AgentId = agentId, ImageUrl = "assets/meals/masala_dosa.jpg" },
                new Meal { Id = Guid.Parse("00000000-0000-0000-0000-000000000005"), Name = "Mango Lassi", Description = "Refreshing yogurt drink", Price = 80, Category = "Drinks", IsVeg = true, IsAvailable = true, AgentId = agentId, ImageUrl = "assets/meals/mango_lassi.jpg" }
            );
        }
    }
}
