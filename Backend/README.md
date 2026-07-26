# MealMate Backend API

This is the backend API for the MealMate food delivery app, built with .NET 8, MySQL, and Entity Framework Core.

## Project Structure

- **Controllers**: Handlers for HTTP requests.
- **Services**: Business logic layer.
- **Repositories**: Data access layer.
- **Models**: Database entities.
- **DTOs**: Data Transfer Objects for API requests and responses.
- **Data**: DbContext and database configuration.
- **Mappings**: AutoMapper profiles.

## Setup Instructions

1. **Database Configuration**:
   - Ensure MySQL is running.
   - Update the connection string in `appsettings.json` with your MySQL credentials.
   - The database `mealmate_db` will be created automatically on the first run using `context.Database.EnsureCreated()`.

2. **Run the API**:
   - Open a terminal in the project root.
   - Run `dotnet build`.
   - Run `dotnet run`.
   - The API will be available at `http://localhost:5000` (or the port specified in your launch settings).

3. **Test with Swagger**:
   - Navigate to `http://localhost:5000/swagger` to test the `POST /api/auth/login` endpoint.

4. **CORS**:
   - The API is configured to allow requests from `http://localhost:8100` (Ionic frontend).

## Authentication API

### POST /api/auth/login
- **Body**:
  ```json
  {
    "phone": "0123456789",
    "role": "Customer"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "user": {
      "id": "guid",
      "phoneNumber": "0123456789",
      "role": "Customer",
      "createdAt": "timestamp"
    }
  }
  ```
