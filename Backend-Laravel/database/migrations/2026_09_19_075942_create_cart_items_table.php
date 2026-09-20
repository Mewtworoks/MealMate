<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Mirrors the existing "CartItems" table created by the .NET/EF Core backend
 * (Backend/Models/CartItem.cs). See create_users_table for why this deviates
 * from Laravel naming conventions.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('CartItems', function (Blueprint $table) {
            $table->char('Id', 36)->primary();
            $table->char('CustomerId', 36);
            $table->char('MealId', 36);
            $table->integer('Quantity');
            $table->decimal('Total', 18, 2);

            $table->index('CustomerId');
            $table->index('MealId');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('CartItems');
    }
};
