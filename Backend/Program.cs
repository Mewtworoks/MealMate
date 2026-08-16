using MealMate.Api.Data;
using MealMate.Api.Repositories;
using MealMate.Api.Services;
using Microsoft.EntityFrameworkCore;
using Pomelo.EntityFrameworkCore.MySql.Infrastructure;
using System.Text.Json;
using System.Text.Json.Serialization;

Environment.SetEnvironmentVariable("DOTNET_USE_POLLING_FILE_WATCHER", "true");
Environment.SetEnvironmentVariable("DOTNET_HOSTBUILDER__RELOADCONFIGONCHANGE", "false");

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
    options.UseMySql(connectionString, new MySqlServerVersion(new Version(5, 7, 30)),
        mySqlOptions => mySqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(10),
            errorNumbersToAdd: null)));


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

// Synchronously apply missing table columns on startup
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetService<AppDbContext>();
    if (context != null)
    {
        Console.WriteLine("--> Checking and adding missing columns to TiDB database...");
        context.Database.EnsureCreated();
        
        string[] alterQueries = new string[]
        {
            "ALTER TABLE Users ADD COLUMN Email VARCHAR(100) NULL",
            "ALTER TABLE Users ADD COLUMN FullName LONGTEXT NULL",
            "ALTER TABLE Users ADD COLUMN Address LONGTEXT NULL",
            "ALTER TABLE Users ADD COLUMN KitchenName LONGTEXT NULL",
            "ALTER TABLE Users ADD COLUMN ServiceRadiusKm DOUBLE DEFAULT 20.0",
            "ALTER TABLE Users ADD COLUMN Latitude DOUBLE NULL",
            "ALTER TABLE Users ADD COLUMN Longitude DOUBLE NULL",
            "ALTER TABLE Meals ADD COLUMN Calories INT DEFAULT 0",
            "ALTER TABLE Meals ADD COLUMN Protein INT DEFAULT 0",
            "ALTER TABLE Meals ADD COLUMN Carbs INT DEFAULT 0",
            "ALTER TABLE Meals ADD COLUMN Fat INT DEFAULT 0",
            "ALTER TABLE Meals ADD COLUMN Fiber INT DEFAULT 0",
            "ALTER TABLE Meals ADD COLUMN SpiceLevel VARCHAR(50) DEFAULT 'Medium'",
            "ALTER TABLE Meals ADD COLUMN PrepTime VARCHAR(50) DEFAULT '25 min'",
            "ALTER TABLE Meals ADD COLUMN PortionSize VARCHAR(50) DEFAULT '350g'",
            "ALTER TABLE Meals ADD COLUMN Ingredients LONGTEXT NULL",
            "ALTER TABLE Meals ADD COLUMN Allergens LONGTEXT NULL",
            "ALTER TABLE Meals ADD COLUMN Rating DOUBLE DEFAULT 4.8",
            "ALTER TABLE Meals ADD COLUMN ReviewCount INT DEFAULT 0",
            "ALTER TABLE Meals ADD COLUMN ReviewsJson LONGTEXT NULL",
            "UPDATE Meals SET ReviewsJson = '[]' WHERE ReviewsJson IS NULL OR ReviewsJson = ''",
            "UPDATE Meals SET Rating = 4.8 WHERE Rating IS NULL OR Rating = 0"
        };

        foreach (var query in alterQueries)
        {
            try
            {
                context.Database.ExecuteSqlRaw(query);
                Console.WriteLine($"[DB MIGRATION SUCCESS]: {query}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DB MIGRATION NOTICE]: {query} -> {ex.Message}");
            }
        }

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

// Lightweight health check endpoint for keep-alive pingers (cron-job.org / UptimeRobot)
app.MapGet("/api/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));

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
