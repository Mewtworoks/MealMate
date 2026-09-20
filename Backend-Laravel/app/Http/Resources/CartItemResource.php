<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Matches the shape the .NET CartController returns: the raw CartItem entity
 * with its Meal navigation property included, serialized to camelCase.
 */
class CartItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->Id,
            'customerId' => $this->CustomerId,
            'mealId' => $this->MealId,
            'quantity' => $this->Quantity,
            'total' => (float) $this->Total,
            'meal' => $this->whenLoaded('meal', fn () => new MealResource($this->meal)),
        ];
    }
}
