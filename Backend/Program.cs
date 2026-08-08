using MealMate.Api.Data;
using MealMate.Api.Repositories;
using MealMate.Api.Services;
using Microsoft.EntityFrameworkCore;
using Pomelo.EntityFrameworkCore.MySql.Infrastructure;
using System.Text.Json;
using System.Text.Json.Serialization;

Environment.SetEnvironmentVariable("DOTNET_USE_POLLING_FILE_WATCHER", "true");

var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args
});

builder.Host.ConfigureAppConfiguration((hostingContext, config) =>
{
    config.Sources.Clear();
    var env = hostingContext.HostingEnvironment;
    config.AddJsonFile("appsettings.json", optional: true, reloadOnChange: false)
          .AddJsonFile($"appsettings.{env.EnvironmentName}.json", optional: true, reloadOnChange: false)
          .AddEnvironmentVariables();
});

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = null;
        options.JsonSerializerOptions.Converters.Add(new RoundedDecimalConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure MySQL Connection
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString, new MySqlServerVersion(new Version(5, 7, 30))));

// Configure DI
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IMealRepository, MealRepository>();
builder.Services.AddScoped<IOrderRepository, OrderRepository>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IMealService, MealService>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<IEarningsService, EarningsService>();
builder.Services.AddHttpClient<IClerkService, ClerkService>();
builder.Services.AddScoped<ISubscriptionRepository, SubscriptionRepository>();
builder.Services.AddScoped<ISubscriptionService, SubscriptionService>();

// Configure AutoMapper
builder.Services.AddAutoMapper(typeof(Program).Assembly);

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("IonicPolicy", policy =>
    {
        policy.SetIsOriginAllowed(origin => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Automatically Create Database (EnsureCreated) asynchronously to keep cold start light & prevent status 139 OOM
Task.Run(() =>
{
    using (var scope = app.Services.CreateScope())
    {
        var services = scope.ServiceProvider;
        try
        {
            var context = services.GetService<AppDbContext>();
            if (context != null)
            {
                Console.WriteLine("Applying database changes in background...");
                context.Database.EnsureCreated();
                
                // Universal SQL to add missing columns
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Users ADD Email VARCHAR(100) NULL"); } catch { }
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Users ADD FullName LONGTEXT NULL"); } catch { }
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Users MODIFY PhoneNumber VARCHAR(15) NULL"); } catch { }
                try { context.Database.ExecuteSqlRaw("UPDATE Users SET PhoneNumber = NULL WHERE PhoneNumber = '' OR PhoneNumber IS NULL"); } catch { }
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Users ADD WalletBalance DECIMAL(18,2) DEFAULT 2500"); } catch { }
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Users ADD CreditLimit DECIMAL(18,2) DEFAULT 500"); } catch { }
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Users ADD CreditUsed DECIMAL(18,2) DEFAULT 0"); } catch { }
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Users ADD LoyaltyPoints INT DEFAULT 1000"); } catch { }
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Users ADD Latitude DOUBLE NULL"); } catch { }
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Users ADD Longitude DOUBLE NULL"); } catch { }
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Users ADD Address LONGTEXT NULL"); } catch { }
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Users ADD KitchenName LONGTEXT NULL"); } catch { }
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Users ADD ServiceRadiusKm DOUBLE DEFAULT 20.0"); } catch { }

                // Fix decimal column precision to 2 decimal places
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Users MODIFY WalletBalance DECIMAL(18,2) DEFAULT 2500"); } catch { }
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Users MODIFY CreditLimit DECIMAL(18,2) DEFAULT 500"); } catch { }
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Users MODIFY CreditUsed DECIMAL(18,2) DEFAULT 0"); } catch { }
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Orders MODIFY TotalAmount DECIMAL(18,2) DEFAULT 0"); } catch { }
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Orders MODIFY WalletAmount DECIMAL(18,2) DEFAULT 0"); } catch { }
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Orders MODIFY CreditUsedAmount DECIMAL(18,2) DEFAULT 0"); } catch { }
                try { context.Database.ExecuteSqlRaw("ALTER TABLE OrderItems MODIFY UnitPrice DECIMAL(18,2) DEFAULT 0"); } catch { }
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Meals MODIFY Price DECIMAL(18,2) DEFAULT 0"); } catch { }
                
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Orders ADD OrderNumber INT AUTO_INCREMENT UNIQUE"); } catch { }
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Orders ADD WalletAmount DECIMAL(18,2) DEFAULT 0"); } catch { }
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Orders ADD CreditUsedAmount DECIMAL(18,2) DEFAULT 0"); } catch { }
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Orders ADD PointsRedeemed INT DEFAULT 0"); } catch { }
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Orders ADD PointsEarned INT DEFAULT 0"); } catch { }
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Orders ADD IsCustomMeal TINYINT(1) DEFAULT 0"); } catch { }
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Orders ADD CustomMealDetails LONGTEXT NULL"); } catch { }

                // Meals table updates for nutrition & details
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Meals ADD Calories INT DEFAULT 0"); } catch { }
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Meals ADD Protein INT DEFAULT 0"); } catch { }
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Meals ADD Carbs INT DEFAULT 0"); } catch { }
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Meals ADD Fat INT DEFAULT 0"); } catch { }
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Meals ADD Fiber INT DEFAULT 0"); } catch { }
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Meals ADD SpiceLevel VARCHAR(50) DEFAULT 'Medium'"); } catch { }
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Meals ADD PrepTime VARCHAR(50) DEFAULT '25 min'"); } catch { }
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Meals ADD PortionSize VARCHAR(50) DEFAULT '350g'"); } catch { }
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Meals ADD Ingredients LONGTEXT NULL"); } catch { }
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Meals ADD Allergens LONGTEXT NULL"); } catch { }

                // Fix NULLs that cause EF Core InvalidCastException for non-nullable string properties
                try { context.Database.ExecuteSqlRaw("UPDATE Meals SET SpiceLevel = 'Medium' WHERE SpiceLevel IS NULL"); } catch { }
                try { context.Database.ExecuteSqlRaw("UPDATE Meals SET PrepTime = '25 min' WHERE PrepTime IS NULL"); } catch { }
                try { context.Database.ExecuteSqlRaw("UPDATE Meals SET PortionSize = '350g' WHERE PortionSize IS NULL"); } catch { }
                try { context.Database.ExecuteSqlRaw("UPDATE Meals SET Ingredients = '' WHERE Ingredients IS NULL"); } catch { }
                try { context.Database.ExecuteSqlRaw("UPDATE Meals SET Allergens = '' WHERE Allergens IS NULL"); } catch { }
                try { context.Database.ExecuteSqlRaw("UPDATE Orders SET DeliveryAddress = '' WHERE DeliveryAddress IS NULL"); } catch { }
                try { context.Database.ExecuteSqlRaw("UPDATE Orders SET PaymentMethod = 'COD' WHERE PaymentMethod IS NULL"); } catch { }
                try { context.Database.ExecuteSqlRaw("UPDATE Orders SET Status = 'Pending' WHERE Status IS NULL"); } catch { }
                try { context.Database.ExecuteSqlRaw("UPDATE Orders SET CustomMealDetails = '' WHERE CustomMealDetails IS NULL"); } catch { }
                try { context.Database.ExecuteSqlRaw("UPDATE Users SET Role = 'Customer' WHERE Role IS NULL"); } catch { }

                // AgentAdvances table
                try
                {
                    context.Database.ExecuteSqlRaw(@"
                        CREATE TABLE IF NOT EXISTS AgentAdvances (
                            Id CHAR(36) NOT NULL PRIMARY KEY,
                            AgentId CHAR(36) NOT NULL,
                            AdvanceTaken DECIMAL(18,2) NOT NULL DEFAULT 0,
                            DailyDeduction DECIMAL(18,2) NOT NULL DEFAULT 100,
                            TotalDeducted DECIMAL(18,2) NOT NULL DEFAULT 0,
                            IsFullyRepaid TINYINT(1) NOT NULL DEFAULT 0,
                            CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                        )");
                }
                catch { }

                // AgentPayouts table
                try
                {
                    context.Database.ExecuteSqlRaw(@"
                        CREATE TABLE IF NOT EXISTS AgentPayouts (
                            Id CHAR(36) NOT NULL PRIMARY KEY,
                            AgentId CHAR(36) NOT NULL,
                            Amount DECIMAL(18,2) NOT NULL DEFAULT 0,
                            Status VARCHAR(50) NOT NULL DEFAULT 'Pending',
                            RequestedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            ProcessedAt DATETIME NULL
                        )");
                }
                catch { }

                // Subscriptions table
                try
                {
                    context.Database.ExecuteSqlRaw(@"
                        CREATE TABLE IF NOT EXISTS Subscriptions (
                            Id CHAR(36) NOT NULL PRIMARY KEY,
                            CustomerId CHAR(36) NOT NULL,
                            StartDate DATETIME NOT NULL,
                            EndDate DATETIME NOT NULL,
                            Months INT NOT NULL DEFAULT 1,
                            Status VARCHAR(50) NOT NULL DEFAULT 'Active',
                            TotalDays INT NOT NULL DEFAULT 30,
                            CurrentDay INT NOT NULL DEFAULT 1,
                            TotalPaid DECIMAL(18,2) NOT NULL DEFAULT 0,
                            DailyDeduction DECIMAL(18,2) NOT NULL DEFAULT 0,
                            PlanName VARCHAR(100) NULL,
                            CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                        )");
                }
                catch { }

                // SubscriptionRotationMeals table
                try
                {
                    context.Database.ExecuteSqlRaw(@"
                        CREATE TABLE IF NOT EXISTS SubscriptionRotationMeals (
                            Id CHAR(36) NOT NULL PRIMARY KEY,
                            SubscriptionId CHAR(36) NOT NULL,
                            MealId CHAR(36) NOT NULL,
                            Position INT NOT NULL DEFAULT 0,
                            PriceAtSubscription DECIMAL(18,2) NOT NULL DEFAULT 0
                        )");
                }
                catch { }

                // SubscriptionSkippedDays table
                try
                {
                    context.Database.ExecuteSqlRaw(@"
                        CREATE TABLE IF NOT EXISTS SubscriptionSkippedDays (
                            Id CHAR(36) NOT NULL PRIMARY KEY,
                            SubscriptionId CHAR(36) NOT NULL,
                            SkippedDate DATETIME NOT NULL
                        )");
                }
                catch { }

                // SubscriptionPausedDays table
                try
                {
                    context.Database.ExecuteSqlRaw(@"
                        CREATE TABLE IF NOT EXISTS SubscriptionPausedDays (
                            Id CHAR(36) NOT NULL PRIMARY KEY,
                            SubscriptionId CHAR(36) NOT NULL,
                            PausedDate DATETIME NOT NULL
                        )");
                }
                catch { }

                // CartItems table
                try
                {
                    context.Database.ExecuteSqlRaw(@"
                        CREATE TABLE IF NOT EXISTS CartItems (
                            Id CHAR(36) NOT NULL PRIMARY KEY,
                            CustomerId CHAR(36) NOT NULL,
                            MealId CHAR(36) NOT NULL,
                            Quantity INT NOT NULL DEFAULT 1,
                            Total DECIMAL(18,2) NOT NULL DEFAULT 0
                        )");
                }
                catch { }

                Console.WriteLine("Database is ready.");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Database initialization failed: {ex.Message}");
        }
    }
});

// Configure the HTTP request pipeline.
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "MealMate API v1");
    c.RoutePrefix = "swagger";
});

app.UseCors("IonicPolicy");

app.UseAuthorization();

app.MapControllers();

app.Run();

/// <summary>
/// Global JSON converter that rounds all decimal values to 2 decimal places.
/// Prevents values like 500.000000000000000000000 from appearing in API responses.
/// </summary>
public class RoundedDecimalConverter : JsonConverter<decimal>
{
    public override decimal Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        return reader.GetDecimal();
    }

    public override void Write(Utf8JsonWriter writer, decimal value, JsonSerializerOptions options)
    {
        writer.WriteNumberValue(Math.Round(value, 2));
    }
}
