<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Mirrors the existing "Users" table created by the .NET/EF Core backend
 * (see Backend/Migrations/AppDbContextModelSnapshot.cs) so this table is
 * schema-compatible with the shared MealMate_DB database. Column names and
 * casing intentionally match the EF Core model (PascalCase) rather than
 * Laravel convention, and there are no auto-incrementing integer ids —
 * EF Core uses GUID primary keys stored as char(36).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('Users', function (Blueprint $table) {
            $table->char('Id', 36)->primary();
            $table->string('Email', 100)->nullable()->unique();
            $table->text('FullName')->nullable();
            $table->string('PhoneNumber', 15)->nullable()->unique();
            $table->string('Role')->default('Customer');
            $table->decimal('WalletBalance', 18, 2)->default(2500);
            $table->decimal('CreditLimit', 18, 2)->default(500);
            $table->decimal('CreditUsed', 18, 2)->default(0);
            $table->integer('LoyaltyPoints')->default(1000);
            $table->double('Latitude')->nullable();
            $table->double('Longitude')->nullable();
            $table->text('Address')->nullable();
            $table->text('KitchenName')->nullable();
            $table->double('ServiceRadiusKm')->default(20.0);
            $table->dateTime('CreatedAt')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('Users');
    }
};
