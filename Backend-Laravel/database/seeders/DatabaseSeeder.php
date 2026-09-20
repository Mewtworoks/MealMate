<?php

namespace Database\Seeders;

use App\Models\Meal;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Seeds the same reference data the .NET/EF Core backend ships with
 * (see Backend/Migrations/AppDbContextModelSnapshot.cs HasData calls),
 * so this API behaves identically when pointed at a fresh database.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['Id' => '11111111-1111-1111-1111-111111111111'],
            [
                'Email' => 'agent@mealmate.com',
                'FullName' => 'Default Chef',
                'PhoneNumber' => '1234567890',
                'Role' => 'Agent',
                'WalletBalance' => 2500,
                'CreditLimit' => 500,
                'CreditUsed' => 0,
                'LoyaltyPoints' => 1000,
                'Latitude' => 28.6139,
                'Longitude' => 77.2090,
                'Address' => 'Connaught Place, New Delhi',
                'KitchenName' => 'Grand Central Kitchen',
                'ServiceRadiusKm' => 20.0,
            ]
        );

        $meals = [
            [
                'Id' => '00000000-0000-0000-0000-000000000001',
                'Name' => 'Dal Makhani',
                'Description' => 'Creamy black lentils',
                'Price' => 180,
                'Category' => 'Thali',
                'ImageUrl' => 'assets/meals/dal_makhani.jpg',
            ],
            [
                'Id' => '00000000-0000-0000-0000-000000000002',
                'Name' => 'Paneer Tikka',
                'Description' => 'Grilled cottage cheese',
                'Price' => 220,
                'Category' => 'Fast Food',
                'ImageUrl' => 'assets/meals/paneer_tikka.jpg',
            ],
            [
                'Id' => '00000000-0000-0000-0000-000000000003',
                'Name' => 'Veg Pulao',
                'Description' => 'Fragrant rice with vegetables',
                'Price' => 150,
                'Category' => 'Thali',
                'ImageUrl' => 'assets/meals/veg_pulao.jpg',
            ],
        ];

        foreach ($meals as $meal) {
            Meal::updateOrCreate(
                ['Id' => $meal['Id']],
                array_merge([
                    'AgentId' => '11111111-1111-1111-1111-111111111111',
                    'IsVeg' => true,
                    'IsAvailable' => true,
                    'PortionSize' => '350g',
                    'PrepTime' => '25 min',
                    'SpiceLevel' => 'Medium',
                    'Rating' => 4.8,
                    'ReviewsJson' => '[]',
                ], $meal)
            );
        }
    }
}
