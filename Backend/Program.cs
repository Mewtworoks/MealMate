using MealMate.Api.Data;
using MealMate.Api.Repositories;
using MealMate.Api.Services;
using Microsoft.EntityFrameworkCore;
using Pomelo.EntityFrameworkCore.MySql.Infrastructure;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddJsonFile("appsettings.json", optional: true, reloadOnChange: false);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = null; // Keeps original casing or adjust as needed
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
builder.Services.AddScoped<ISubscriptionRepository, SubscriptionRepository>();
builder.Services.AddScoped<ISubscriptionService, SubscriptionService>();

// Configure AutoMapper
builder.Services.AddAutoMapper(typeof(Program).Assembly);

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("IonicPolicy", policy =>
    {
        policy.WithOrigins(
                "http://localhost:8100",       // Ionic dev server
                "http://localhost",             // Cordova Android webview
                "https://localhost",            // Cordova Android HTTPS
                "capacitor://localhost",        // Capacitor
                "ionic://localhost",            // Ionic webview
                "file://"                       // File-based webview (older Cordova)
              )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Automatically Create Database (EnsureCreated)
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetService<AppDbContext>();
        if (context != null)
        {
            Console.WriteLine("Applying database changes...");
            context.Database.EnsureCreated();
            
            // Universal SQL to add missing columns
            try { context.Database.ExecuteSqlRaw("ALTER TABLE Users ADD Email VARCHAR(100) NULL"); } catch { }
            try { context.Database.ExecuteSqlRaw("ALTER TABLE Users ADD FullName LONGTEXT NULL"); } catch { }
            try { context.Database.ExecuteSqlRaw("ALTER TABLE Users MODIFY PhoneNumber VARCHAR(15) NULL"); } catch { }
            try { context.Database.ExecuteSqlRaw("ALTER TABLE Users ADD WalletBalance DECIMAL(18,2) DEFAULT 2500"); } catch { }
            try { context.Database.ExecuteSqlRaw("ALTER TABLE Users ADD CreditLimit DECIMAL(18,2) DEFAULT 500"); } catch { }
            try { context.Database.ExecuteSqlRaw("ALTER TABLE Users ADD CreditUsed DECIMAL(18,2) DEFAULT 0"); } catch { }
            try { context.Database.ExecuteSqlRaw("ALTER TABLE Users ADD LoyaltyPoints INT DEFAULT 1000"); } catch { }
            
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
                Console.WriteLine("AgentAdvances table ready.");
            }
            catch (Exception ex) { Console.WriteLine($"AgentAdvances table creation: {ex.Message}"); }

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
                Console.WriteLine("AgentPayouts table ready.");
            }
            catch (Exception ex) { Console.WriteLine($"AgentPayouts table creation: {ex.Message}"); }

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
                Console.WriteLine("Subscriptions table ready.");
            }
            catch (Exception ex) { Console.WriteLine($"Subscriptions table creation: {ex.Message}"); }

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
                Console.WriteLine("SubscriptionRotationMeals table ready.");
            }
            catch (Exception ex) { Console.WriteLine($"SubscriptionRotationMeals table creation: {ex.Message}"); }

            // SubscriptionSkippedDays table
            try
            {
                context.Database.ExecuteSqlRaw(@"
                    CREATE TABLE IF NOT EXISTS SubscriptionSkippedDays (
                        Id CHAR(36) NOT NULL PRIMARY KEY,
                        SubscriptionId CHAR(36) NOT NULL,
                        SkippedDate DATETIME NOT NULL
                    )");
                Console.WriteLine("SubscriptionSkippedDays table ready.");
            }
            catch (Exception ex) { Console.WriteLine($"SubscriptionSkippedDays table creation: {ex.Message}"); }

            // SubscriptionPausedDays table
            try
            {
                context.Database.ExecuteSqlRaw(@"
                    CREATE TABLE IF NOT EXISTS SubscriptionPausedDays (
                        Id CHAR(36) NOT NULL PRIMARY KEY,
                        SubscriptionId CHAR(36) NOT NULL,
                        PausedDate DATETIME NOT NULL
                    )");
                Console.WriteLine("SubscriptionPausedDays table ready.");
            }
            catch (Exception ex) { Console.WriteLine($"SubscriptionPausedDays table creation: {ex.Message}"); }

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
                Console.WriteLine("CartItems table ready.");
            }
            catch (Exception ex) { Console.WriteLine($"CartItems table creation: {ex.Message}"); }

            Console.WriteLine("Database is ready.");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Database initialization failed: {ex.Message}");
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else 
{
    app.UseHttpsRedirection();
}

app.UseCors("IonicPolicy");

app.UseAuthorization();

app.MapControllers();

app.Run();
