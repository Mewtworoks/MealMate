# MealMate Laravel API — deploys as its own Render Web Service, separate
# from the .NET backend, sharing the same MySQL/TiDB database.

FROM php:8.3-cli

RUN apt-get update && apt-get install -y \
    git unzip libzip-dev libpng-dev ca-certificates \
    && docker-php-ext-install pdo pdo_mysql zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY . .

RUN composer install --no-dev --optimize-autoloader --no-interaction

EXPOSE 8080
ENV PORT=8080

# No `artisan migrate` here on purpose — the Meals/Users/CartItems tables
# already exist in the shared production database (created by the .NET/EF
# Core backend). This API only ever reads/writes those existing rows.
CMD php artisan config:clear && php artisan serve --host=0.0.0.0 --port=${PORT}
