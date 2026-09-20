<?php

use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\MealController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Mirrors the route shapes of the existing .NET backend
| (Backend/Controllers/MealsController.cs, CartController.cs) so the
| Angular frontend can point either service's calls at this API without
| any other change.
|
*/

Route::prefix('meals')->group(function () {
    Route::get('/', [MealController::class, 'index']);
    Route::get('/agent/{agentId}', [MealController::class, 'byAgent']);
    Route::get('/{id}', [MealController::class, 'show']);
    Route::post('/', [MealController::class, 'store']);
    Route::put('/{id}', [MealController::class, 'update']);
    Route::delete('/{id}', [MealController::class, 'destroy']);
    Route::post('/{id}/review', [MealController::class, 'addReview']);
});

Route::prefix('cart')->group(function () {
    Route::get('/{userId}', [CartController::class, 'show']);
    Route::post('/{userId}/sync', [CartController::class, 'sync']);
    Route::delete('/{userId}', [CartController::class, 'clear']);
});
