<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CartItemResource;
use App\Models\CartItem;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * PHP/Laravel port of Backend/Controllers/CartController.cs.
 */
class CartController extends Controller
{
    // GET /api/cart/{userId}
    public function show(string $userId)
    {
        if (!Str::isUuid($userId)) {
            return response()->json([]);
        }

        $items = CartItem::with('meal')->where('CustomerId', $userId)->get();

        return CartItemResource::collection($items);
    }

    // POST /api/cart/{userId}/sync
    public function sync(Request $request, string $userId)
    {
        if (Str::isUuid($userId)) {
            CartItem::where('CustomerId', $userId)->delete();

            foreach ($request->input() as $item) {
                $mealId = $item['mealId'] ?? $item['MealId'] ?? null;
                if (!$mealId) {
                    continue;
                }

                CartItem::create([
                    'CustomerId' => $userId,
                    'MealId' => $mealId,
                    'Quantity' => $item['quantity'] ?? $item['Quantity'] ?? 1,
                    'Total' => $item['total'] ?? $item['Total'] ?? 0,
                ]);
            }
        }

        return response()->json(['success' => true]);
    }

    // DELETE /api/cart/{userId}
    public function clear(string $userId)
    {
        if (Str::isUuid($userId)) {
            CartItem::where('CustomerId', $userId)->delete();
        }

        return response()->json(['success' => true]);
    }
}
