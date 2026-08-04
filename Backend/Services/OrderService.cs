using MealMate.Api.Models;
using MealMate.Api.Repositories;
using MealMate.Api.DTOs;
using AutoMapper;

namespace MealMate.Api.Services
{
    public interface IOrderService
    {
        Task<OrderResponseDto> PlaceOrderAsync(OrderRequestDto orderRequest);
        Task<IEnumerable<OrderResponseDto>> GetCustomerOrdersAsync(string customerId);
        Task<IEnumerable<OrderResponseDto>> GetAgentOrdersAsync(string agentId);
        Task<bool> UpdateOrderStatusAsync(string orderId, string status);
    }

    public class OrderService : IOrderService
    {
        private readonly IOrderRepository _orderRepository;
        private readonly IMealRepository _mealRepository;
        private readonly IUserRepository _userRepository;
        private readonly IMapper _mapper;

        public OrderService(IOrderRepository orderRepository, IMealRepository mealRepository, IUserRepository userRepository, IMapper mapper)
        {
            _orderRepository = orderRepository;
            _mealRepository = mealRepository;
            _userRepository = userRepository;
            _mapper = mapper;
        }

        public async Task<OrderResponseDto> PlaceOrderAsync(OrderRequestDto orderRequest)
        {
            var customerGuid = await ResolveUserGuidAsync(orderRequest.CustomerId, "Customer");
            var agentGuid = await ResolveUserGuidAsync(orderRequest.AgentId, "Agent");

            var order = new Order
            {
                Id = Guid.NewGuid(),
                CustomerId = customerGuid,
                AgentId = agentGuid,
                OrderDate = DateTime.UtcNow,
                Status = "Pending",
                DeliveryAddress = orderRequest.DeliveryAddress,
                PaymentMethod = orderRequest.PaymentMethod,
                IsCustomMeal = orderRequest.IsCustomMeal,
                CustomMealDetails = orderRequest.CustomMealDetails
            };

            decimal totalAmount = orderRequest.IsCustomMeal ? orderRequest.EstimatedTotal : 0;

            foreach (var itemDto in orderRequest.Items)
            {
                var meal = await _mealRepository.GetByIdAsync(itemDto.MealId);
                if (meal != null)
                {
                    var orderItem = new OrderItem
                    {
                        Id = Guid.NewGuid(),
                        OrderId = order.Id,
                        MealId = meal.Id,
                        Quantity = itemDto.Quantity,
                        UnitPrice = meal.Price
                    };
                    order.OrderItems.Add(orderItem);
                    totalAmount += orderItem.UnitPrice * orderItem.Quantity;
                }
            }

            order.TotalAmount = totalAmount;

            if (order.PaymentMethod == "Wallet")
            {
                var user = await _userRepository.GetByIdAsync(order.CustomerId);
                if (user == null) throw new Exception("User not found");

                decimal remainingToPay = totalAmount;

                // 1. Point Redemption
                if (orderRequest.RedeemPoints && user.LoyaltyPoints > 0)
                {
                    int maxPointsToRedeem = (int)Math.Min(user.LoyaltyPoints, (double)remainingToPay * 0.1);
                    remainingToPay -= maxPointsToRedeem;
                    user.LoyaltyPoints -= maxPointsToRedeem;
                    order.PointsRedeemed = maxPointsToRedeem;
                }

                // 2. Wallet Balance Deduction
                decimal fromWallet = Math.Min(user.WalletBalance, remainingToPay);
                user.WalletBalance -= fromWallet;
                remainingToPay -= fromWallet;
                order.WalletAmount = fromWallet;

                // 3. Credit Limit Usage
                if (remainingToPay > 0)
                {
                    if (user.CreditUsed + remainingToPay <= user.CreditLimit)
                    {
                        user.CreditUsed += remainingToPay;
                        order.CreditUsedAmount = remainingToPay;
                        remainingToPay = 0;
                    }
                    else
                    {
                        throw new Exception("Insufficient balance and credit limit.");
                    }
                }

                // 4. Earn Loyalty Points (1pt per ₹10 spent)
                int pointsEarned = (int)Math.Floor(totalAmount / 10);
                user.LoyaltyPoints += pointsEarned;
                order.PointsEarned = pointsEarned;

                await _userRepository.UpdateAsync(user);
            }

            var result = await _orderRepository.AddAsync(order);
            
            // Re-fetch to include Meals for mapping
            var createdOrder = await _orderRepository.GetByIdAsync(result.Id);
            return _mapper.Map<OrderResponseDto>(createdOrder);
        }

        public async Task<IEnumerable<OrderResponseDto>> GetCustomerOrdersAsync(string customerId)
        {
            var guid = await ResolveUserGuidAsync(customerId, "Customer");
            var orders = await _orderRepository.GetByCustomerIdAsync(guid);
            return _mapper.Map<IEnumerable<OrderResponseDto>>(orders);
        }

        public async Task<IEnumerable<OrderResponseDto>> GetAgentOrdersAsync(string agentId)
        {
            var guid = await ResolveUserGuidAsync(agentId, "Agent");
            var orders = await _orderRepository.GetByAgentIdAsync(guid);
            return _mapper.Map<IEnumerable<OrderResponseDto>>(orders);
        }

        private async Task<Guid> ResolveUserGuidAsync(string? userInput, string defaultRole = "Customer")
        {
            if (!string.IsNullOrWhiteSpace(userInput))
            {
                var inputClean = userInput.Trim();

                if (Guid.TryParse(inputClean, out Guid parsedGuid))
                {
                    var userByGuid = await _userRepository.GetByIdAsync(parsedGuid);
                    if (userByGuid != null) return userByGuid.Id;
                }

                var userByEmail = await _userRepository.GetByEmailAsync(inputClean.ToLower());
                if (userByEmail != null) return userByEmail.Id;
            }

            var allUsers = await _userRepository.GetAllAsync();
            var fallbackUser = allUsers.FirstOrDefault(u => u.Role == defaultRole) 
                ?? allUsers.FirstOrDefault();

            if (fallbackUser != null) return fallbackUser.Id;

            var newUser = new User
            {
                Id = Guid.NewGuid(),
                Email = $"{defaultRole.ToLower()}@mealmate.com",
                FullName = $"MealMate {defaultRole}",
                Role = defaultRole,
                CreatedAt = DateTime.UtcNow
            };
            await _userRepository.AddAsync(newUser);
            return newUser.Id;
        }

        public async Task<bool> UpdateOrderStatusAsync(string orderId, string status)
        {
            if (!orderId.StartsWith("MM") || !int.TryParse(orderId.Substring(2), out int orderNum)) {
                return false;
            }

            var order = await _orderRepository.GetByOrderNumberAsync(orderNum);
            if (order == null) return false;

            await _orderRepository.UpdateStatusAsync(order.Id, status);
            return true;
        }
    }
}
