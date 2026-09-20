<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\MealResource;
use App\Models\Meal;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * PHP/Laravel port of Backend/Controllers/MealsController.cs +
 * Backend/Services/MealService.cs. Route shapes and behaviour mirror the
 * original .NET endpoints so the Angular frontend can call either backend
 * interchangeably.
 */
class MealController extends Controller
{
    // GET /api/meals?category=
    public function index(Request $request)
    {
        $query = Meal::query();

        if ($category = $request->query('category')) {
            $query->where('Category', $category);
        }

        return MealResource::collection($query->get());
    }

    // GET /api/meals/agent/{agentId}
    public function byAgent(string $agentId)
    {
        $agentGuid = $this->resolveAgentGuid($agentId);
        $meals = Meal::where('AgentId', $agentGuid)->get();

        return MealResource::collection($meals);
    }

    // GET /api/meals/{id}
    public function show(string $id)
    {
        $meal = Meal::find($id);
        if (!$meal) {
            return response()->json(null, 404);
        }

        return new MealResource($meal);
    }

    // POST /api/meals
    public function store(Request $request)
    {
        $data = $this->extractMealPayload($request);
        $data['AgentId'] = $this->resolveAgentGuid($request->input('agentId', $request->input('AgentId')));

        $meal = Meal::create($data)->refresh();

        return (new MealResource($meal))
            ->response()
            ->setStatusCode(201);
    }

    // PUT /api/meals/{id}
    public function update(Request $request, string $id)
    {
        $meal = Meal::find($id);
        if (!$meal) {
            return response()->json(null, 404);
        }

        $data = $this->extractMealPayload($request);
        $data['AgentId'] = $this->resolveAgentGuid($request->input('agentId', $request->input('AgentId')));

        $meal->update($data);

        return response()->noContent();
    }

    // DELETE /api/meals/{id}
    public function destroy(string $id)
    {
        $meal = Meal::find($id);
        if (!$meal) {
            return response()->json(null, 404);
        }

        $meal->delete();

        return response()->noContent();
    }

    // POST /api/meals/{id}/review
    public function addReview(Request $request, string $id)
    {
        $meal = Meal::find($id);
        if (!$meal) {
            return response()->json(null, 404);
        }

        $reviews = [];
        if (!empty($meal->ReviewsJson)) {
            $decoded = json_decode($meal->ReviewsJson, true);
            if (is_array($decoded)) {
                $reviews = $decoded;
            }
        }

        $review = [
            'id' => $request->input('id', (string) Str::uuid()),
            'mealId' => $request->input('mealId', $id),
            'mealName' => $request->input('mealName', $meal->Name),
            'userId' => $request->input('userId', ''),
            'userName' => $request->input('userName', ''),
            'userAvatarBg' => $request->input('userAvatarBg', '#F26A21'),
            'rating' => (float) $request->input('rating', 5),
            'comment' => $request->input('comment', ''),
            'date' => $request->input('date', now()->format('M j, Y')),
        ];

        array_unshift($reviews, $review);

        $meal->ReviewsJson = json_encode($reviews);
        $meal->ReviewCount = count($reviews);
        $ratings = array_column($reviews, 'rating');
        $meal->Rating = round(array_sum($ratings) / count($ratings), 1);
        $meal->save();

        return response()->json(['message' => 'Review added successfully']);
    }

    /** Mirrors MealService.ResolveAgentGuidAsync from the .NET backend. */
    private function resolveAgentGuid(?string $agentIdInput): string
    {
        if (!empty($agentIdInput)) {
            $input = trim($agentIdInput);

            if (Str::isUuid($input)) {
                $byId = User::find($input);
                if ($byId) {
                    return $byId->Id;
                }
            }

            $byEmail = User::whereRaw('LOWER(Email) = ?', [strtolower($input)])->first();
            if ($byEmail) {
                return $byEmail->Id;
            }
        }

        $agent = User::where('Role', 'Agent')->first() ?? User::first();
        if ($agent) {
            return $agent->Id;
        }

        $fallback = User::create([
            'Email' => 'agent@mealmate.com',
            'FullName' => 'MealMate Chef',
            'Role' => 'Agent',
        ]);

        return $fallback->Id;
    }

    private function extractMealPayload(Request $request): array
    {
        $get = fn (string $camel, string $pascal, $default = null) => $request->input($camel, $request->input($pascal, $default));

        return [
            'Name' => $get('name', 'Name', ''),
            'Description' => $get('description', 'Description', ''),
            'Price' => $get('price', 'Price', 0),
            'Category' => $get('category', 'Category', ''),
            'ImageUrl' => $get('imageUrl', 'ImageUrl', ''),
            'IsVeg' => filter_var($get('isVeg', 'IsVeg', false), FILTER_VALIDATE_BOOLEAN),
            'IsAvailable' => filter_var($get('isAvailable', 'IsAvailable', true), FILTER_VALIDATE_BOOLEAN),
            'Calories' => $get('calories', 'Calories', 0),
            'Protein' => $get('protein', 'Protein', 0),
            'Carbs' => $get('carbs', 'Carbs', 0),
            'Fat' => $get('fat', 'Fat', 0),
            'Fiber' => $get('fiber', 'Fiber', 0),
            'SpiceLevel' => $get('spiceLevel', 'SpiceLevel', 'Medium'),
            'PrepTime' => $get('prepTime', 'PrepTime', '25 min'),
            'PortionSize' => $get('portionSize', 'PortionSize', '350g'),
            'Ingredients' => $get('ingredients', 'Ingredients', ''),
            'Allergens' => $get('allergens', 'Allergens', ''),
        ];
    }
}
