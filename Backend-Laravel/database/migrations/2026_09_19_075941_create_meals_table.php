<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Mirrors the existing "Meals" table created by the .NET/EF Core backend
 * (Backend/Models/Meal.cs). See create_users_table for why this deviates
 * from Laravel naming conventions.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('Meals', function (Blueprint $table) {
            $table->char('Id', 36)->primary();
            $table->text('Name');
            $table->text('Description')->nullable();
            $table->decimal('Price', 18, 2);
            $table->text('Category')->nullable();
            $table->text('ImageUrl')->nullable();
            $table->boolean('IsVeg')->default(false);
            $table->boolean('IsAvailable')->default(true);
            $table->char('AgentId', 36);
            $table->integer('Calories')->default(0);
            $table->integer('Protein')->default(0);
            $table->integer('Carbs')->default(0);
            $table->integer('Fat')->default(0);
            $table->integer('Fiber')->default(0);
            $table->text('SpiceLevel')->nullable();
            $table->text('PrepTime')->nullable();
            $table->text('PortionSize')->nullable();
            $table->text('Ingredients')->nullable();
            $table->text('Allergens')->nullable();
            $table->longText('ReviewsJson')->nullable()->default('[]');
            $table->double('Rating')->default(4.8);
            $table->integer('ReviewCount')->default(0);

            $table->index('AgentId');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('Meals');
    }
};
