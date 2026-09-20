<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Maps to the "CartItems" table shared with the .NET/EF Core backend
 * (see Backend/Models/CartItem.cs).
 */
class CartItem extends Model
{
    protected $table = 'CartItems';
    protected $primaryKey = 'Id';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = ['Id', 'CustomerId', 'MealId', 'Quantity', 'Total'];

    protected $casts = [
        'Total' => 'decimal:2',
    ];

    protected static function booted(): void
    {
        static::creating(function (CartItem $item) {
            if (empty($item->{$item->getKeyName()})) {
                $item->{$item->getKeyName()} = (string) Str::uuid();
            }
        });
    }

    public function meal()
    {
        return $this->belongsTo(Meal::class, 'MealId', 'Id');
    }

    public function customer()
    {
        return $this->belongsTo(User::class, 'CustomerId', 'Id');
    }
}
