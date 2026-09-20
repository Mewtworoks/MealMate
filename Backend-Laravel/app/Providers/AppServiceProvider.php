<?php

namespace App\Providers;

use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // The .NET API this replaces returns bare arrays/objects (no "data"
        // envelope), and the Angular frontend expects that shape directly.
        JsonResource::withoutWrapping();
    }
}
