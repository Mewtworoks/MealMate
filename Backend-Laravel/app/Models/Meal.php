<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Maps to the "Meals" table shared with the .NET/EF Core backend
 * (see Backend/Models/Meal.cs). Column names intentionally match the
 * existing EF Core schema rather than Laravel snake_case convention.
 */
class Meal extends Model
{
    protected $table = 'Meals';
    protected $primaryKey = 'Id';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'Id', 'Name', 'Description', 'Price', 'Category', 'ImageUrl',
        'IsVeg', 'IsAvailable', 'AgentId',
        'Calories', 'Protein', 'Carbs', 'Fat', 'Fiber',
        'SpiceLevel', 'PrepTime', 'PortionSize', 'Ingredients', 'Allergens',
        'ReviewsJson', 'Rating', 'ReviewCount',
    ];

    protected $casts = [
        'IsVeg' => 'boolean',
        'IsAvailable' => 'boolean',
        'Price' => 'decimal:2',
        'Rating' => 'float',
    ];

    protected static function booted(): void
    {
        static::creating(function (Meal $meal) {
            if (empty($meal->{$meal->getKeyName()})) {
                $meal->{$meal->getKeyName()} = (string) Str::uuid();
            }
        });
    }

    public function agent()
    {
        return $this->belongsTo(User::class, 'AgentId', 'Id');
    }
}
