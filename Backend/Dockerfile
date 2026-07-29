# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /source

# Copy all files
COPY . .

# Detect project path dynamically & restore/publish
RUN if [ -f "MealMate.Api.csproj" ]; then \
        dotnet restore "MealMate.Api.csproj" && dotnet publish "MealMate.Api.csproj" -c Release -o /app; \
    else \
        dotnet restore "Backend/MealMate.Api.csproj" && dotnet publish "Backend/MealMate.Api.csproj" -c Release -o /app; \
    fi

# Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app .

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENV PORT=8080
ENV DOTNET_USE_POLLING_FILE_WATCHER=false
ENV DOTNET_gcServer=0
ENV DOTNET_GCHeapHardLimit=0x14000000
ENV DOTNET_GCLatencyMode=1

ENTRYPOINT ["dotnet", "MealMate.Api.dll"]
