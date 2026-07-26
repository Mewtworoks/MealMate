using AutoMapper;
using MealMate.Api.Models;
using MealMate.Api.DTOs;

namespace MealMate.Api.Mappings
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            CreateMap<User, UserResponseDto>();
            CreateMap<Meal, MealResponseDto>();
            CreateMap<MealRequestDto, Meal>();
            CreateMap<Order, OrderResponseDto>()
                .ForMember(dest => dest.Id, opt => opt.MapFrom(src => $"MM{src.OrderNumber}"))
                .ForMember(dest => dest.CustomerName, opt => opt.MapFrom(src => (src.Customer != null && !string.IsNullOrEmpty(src.Customer.FullName)) ? src.Customer.FullName : "Guest"))
                .ForMember(dest => dest.CustomerPhone, opt => opt.MapFrom(src => (src.Customer != null && !string.IsNullOrEmpty(src.Customer.PhoneNumber)) ? src.Customer.PhoneNumber : string.Empty))
                .ForMember(dest => dest.DistanceKm, opt => opt.MapFrom(src => Math.Round(0.5 + Math.Abs(src.Id.GetHashCode() % 45) / 10.0, 1)));
            CreateMap<OrderItem, OrderItemResponseDto>()
                .ForMember(dest => dest.MealName, opt => opt.MapFrom(src => src.Meal != null ? src.Meal.Name : string.Empty));
        }
    }
}
