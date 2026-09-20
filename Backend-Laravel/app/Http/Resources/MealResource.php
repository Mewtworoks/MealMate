<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Matches the shape of Backend/DTOs/MealDto.cs MealResponseDto — the .NET API
 * serializes to camelCase JSON by default, so this mirrors that exactly.
 */
class MealResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->Id,
            'name' => $this->Name,
            'description' => $this->Description,
            'price' => (float) $this->Price,
            'category' => $this->Category,
            'imageUrl' => $this->ImageUrl,
            'isVeg' => (bool) $this->IsVeg,
            'isAvailable' => (bool) $this->IsAvailable,
            'agentId' => $this->AgentId,
            'calories' => $this->Calories,
            'protein' => $this->Protein,
            'carbs' => $this->Carbs,
            'fat' => $this->Fat,
            'fiber' => $this->Fiber,
            'spiceLevel' => $this->SpiceLevel,
            'prepTime' => $this->PrepTime,
            'portionSize' => $this->PortionSize,
            'ingredients' => $this->Ingredients,
            'allergens' => $this->Allergens,
            'reviewsJson' => $this->ReviewsJson,
            'rating' => (float) $this->Rating,
            'reviewCount' => $this->ReviewCount,
        ];
    }
}
