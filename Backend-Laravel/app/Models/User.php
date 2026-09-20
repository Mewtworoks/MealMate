<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Maps to the "Users" table shared with the .NET/EF Core backend.
 * This is a plain domain model, not Laravel's Authenticatable — this API
 * doesn't own auth (that stays on the existing backend for now).
 */
class User extends Model
{
    protected $table = 'Users';
    protected $primaryKey = 'Id';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'Id', 'Email', 'FullName', 'PhoneNumber', 'Role',
        'WalletBalance', 'CreditLimit', 'CreditUsed', 'LoyaltyPoints',
        'Latitude', 'Longitude', 'Address', 'KitchenName', 'ServiceRadiusKm',
        'CreatedAt',
    ];

    protected static function booted(): void
    {
        static::creating(function (User $user) {
            if (empty($user->{$user->getKeyName()})) {
                $user->{$user->getKeyName()} = (string) Str::uuid();
            }
            if (empty($user->CreatedAt)) {
                $user->CreatedAt = now();
            }
        });
    }
}
