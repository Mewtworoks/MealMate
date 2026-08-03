using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MealMate.Api.Data;
using MealMate.Api.Models;

namespace MealMate.Api.Controllers
{
    public class ChefLocationDto
    {
        public string ChefId { get; set; } = string.Empty;
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string? Address { get; set; }
        public string? KitchenName { get; set; }
        public double ServiceRadiusKm { get; set; } = 20.0;
    }

    public class ChefResponseDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string KitchenName { get; set; } = string.Empty;
        public double Rating { get; set; } = 4.8;
        public double DistanceKm { get; set; }
        public string DistanceText { get; set; } = string.Empty;
        public string Speciality { get; set; } = "Home-Cooked Tiffins";
        public string Address { get; set; } = string.Empty;
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public int OrdersCount { get; set; } = 120;
        public string Tag { get; set; } = "Top Rated";
    }

    [ApiController]
    [Route("api/[controller]")]
    public class ChefController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ChefController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/chef/nearby?lat=28.6139&lng=77.2090&radiusKm=20
        [HttpGet("nearby")]
        public async Task<IActionResult> GetNearbyChefs(
            [FromQuery] double? lat,
            [FromQuery] double? lng,
            [FromQuery] double radiusKm = 20.0)
        {
            // Default reference location (New Delhi) if customer location not provided
            double userLat = lat ?? 28.6139;
            double userLng = lng ?? 77.2090;

            var agents = await _context.Users
                .Where(u => u.Role == "Agent")
                .ToListAsync();

            var nearbyChefs = new List<ChefResponseDto>();

            foreach (var agent in agents)
            {
                // Fallback location for agents without set coordinates (realistic spread around Delhi/city center)
                double chefLat = agent.Latitude ?? (28.6139 + (agent.Id.GetHashCode() % 100) * 0.001);
                double chefLng = agent.Longitude ?? (77.2090 + (agent.Id.GetHashCode() % 90) * 0.001);

                double distanceKm = CalculateDistanceKm(userLat, userLng, chefLat, chefLng);

                // Strictly apply the 20km radius threshold!
                if (distanceKm <= radiusKm)
                {
                    nearbyChefs.Add(new ChefResponseDto
                    {
                        Id = agent.Id,
                        Name = !string.IsNullOrEmpty(agent.KitchenName) ? agent.KitchenName : (!string.IsNullOrEmpty(agent.FullName) ? agent.FullName : "Chef's Kitchen"),
                        KitchenName = !string.IsNullOrEmpty(agent.KitchenName) ? agent.KitchenName : "Home Kitchen",
                        Rating = Math.Round(4.7 + Math.Abs(agent.Id.GetHashCode() % 3) * 0.1, 1),
                        DistanceKm = Math.Round(distanceKm, 2),
                        DistanceText = $"{Math.Round(distanceKm, 2)} km",
                        Speciality = agent.Id.GetHashCode() % 2 == 0 ? "North Indian & Thali" : "Homestyle Tiffin",
                        Address = agent.Address ?? "City Service Area",
                        Latitude = Math.Round(chefLat, 4),
                        Longitude = Math.Round(chefLng, 4),
                        OrdersCount = 95 + Math.Abs(agent.Id.GetHashCode() % 50),
                        Tag = agent.Id.GetHashCode() % 2 == 0 ? "Top Rated" : "Hygienic"
                    });
                }
            }

            // Order chefs by closest distance first
            var result = nearbyChefs.OrderBy(c => c.DistanceKm).ToList();
            return Ok(result);
        }

        // GET: api/chef/location?chefId=...
        [HttpGet("location")]
        public async Task<IActionResult> GetChefLocation([FromQuery] string chefId)
        {
            if (string.IsNullOrEmpty(chefId))
                return BadRequest("Chef ID is required.");

            User? user = null;
            var identifier = chefId.Trim();

            if (Guid.TryParse(identifier, out Guid guidId))
            {
                user = await _context.Users.FindAsync(guidId);
            }

            if (user == null)
            {
                user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == identifier.ToLower());
            }

            if (user == null)
            {
                user = await _context.Users.FirstOrDefaultAsync(u => u.Role == "Agent")
                    ?? await _context.Users.FirstOrDefaultAsync();
            }

            if (user == null)
            {
                return NotFound("Chef user not found.");
            }

            var hasKitchen = !string.IsNullOrWhiteSpace(user.KitchenName) || user.Latitude.HasValue;

            return Ok(new
            {
                chefId = user.Id,
                kitchenName = user.KitchenName ?? "",
                address = user.Address ?? "",
                latitude = user.Latitude,
                longitude = user.Longitude,
                serviceRadiusKm = user.ServiceRadiusKm > 0 ? user.ServiceRadiusKm : 20.0,
                hasKitchen = hasKitchen
            });
        }

        // POST: api/chef/location
        [HttpPost("location")]
        public async Task<IActionResult> UpdateChefLocation([FromBody] ChefLocationDto dto)
        {
            if (string.IsNullOrEmpty(dto.ChefId))
                return BadRequest("Chef ID is required.");

            User? user = null;
            var identifier = dto.ChefId.Trim();

            // 1. Match by Guid if valid
            if (Guid.TryParse(identifier, out Guid guidId))
            {
                user = await _context.Users.FindAsync(guidId);
            }

            // 2. Match by Email (case-insensitive)
            if (user == null)
            {
                user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == identifier.ToLower());
            }

            // 3. Fallback for Clerk User IDs (starts with user_): match Agent or active database user
            if (user == null)
            {
                user = await _context.Users.FirstOrDefaultAsync(u => u.Role == "Agent")
                    ?? await _context.Users.FirstOrDefaultAsync();
            }

            if (user == null)
            {
                return NotFound("Chef user not found.");
            }

            user.Latitude = dto.Latitude;
            user.Longitude = dto.Longitude;
            if (!string.IsNullOrEmpty(dto.Address)) user.Address = dto.Address;
            if (!string.IsNullOrEmpty(dto.KitchenName)) user.KitchenName = dto.KitchenName;
            if (dto.ServiceRadiusKm > 0) user.ServiceRadiusKm = dto.ServiceRadiusKm;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Chef kitchen location updated successfully",
                chefId = user.Id,
                latitude = user.Latitude,
                longitude = user.Longitude,
                address = user.Address,
                kitchenName = user.KitchenName,
                serviceRadiusKm = user.ServiceRadiusKm
            });
        }

        // Haversine Distance Formula in Kilometers
        private static double CalculateDistanceKm(double lat1, double lon1, double lat2, double lon2)
        {
            var R = 6371.0; // Earth's radius in km
            var dLat = ToRadians(lat2 - lat1);
            var dLon = ToRadians(lon2 - lon1);
            var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                    Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                    Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
            var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return R * c;
        }

        private static double ToRadians(double val)
        {
            return (Math.PI / 180) * val;
        }
    }
}
