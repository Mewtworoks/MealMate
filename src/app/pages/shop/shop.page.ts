import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { MealService, Meal, Agent } from '../../services/meal.service';
import { CartService } from '../../services/cart.service';
import { WalletService } from '../../services/wallet.service';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';

import { Gemini } from '../../services/gemini';

@Component({
  selector: 'app-shop',
  templateUrl: './shop.page.html',
  styleUrls: ['./shop.page.scss'],
  standalone: false
})
export class ShopPage implements OnInit {
  meals: Meal[] = [];
  aiPicks: Meal[] = [];
  agents: Agent[] = [];
  categories = ['Lunch', 'Thali', 'Fast Food', 'Snacks', 'Drinks'];
  selectedCategory = 'Lunch';
  isLoading = true;

  getCategoryIcon(category: string): string {
    const icons: { [key: string]: string } = {
      'Lunch': 'restaurant-outline',
      'Thali': 'color-palette-outline',
      'Fast Food': 'fast-food-outline',
      'Snacks': 'pizza-outline',
      'Drinks': 'cafe-outline'
    };
    return icons[category] || 'restaurant-outline';
  }

  walletBalance = 0;
  credits = 0;
  cartCount = 0;

  greeting = 'Good morning';
  userName = 'Foodie';
  userLocation = 'Fetching location...';

  constructor(
    private mealService: MealService,
    public cartService: CartService,
    public wallet: WalletService,
    private auth: AuthService,
    private router: Router,
    private gemini: Gemini
  ) { }

  ngOnInit() {
    this.mealService.meals$.subscribe(m => this.meals = m);
    this.agents = this.mealService.getAgents();

    this.wallet.balance$.subscribe(b => this.walletBalance = b);
    this.wallet.credits$.subscribe(c => this.credits = c);

    this.cartService.cart$.subscribe(items => {
      this.cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
    });

    this.updateGreeting();
    this.userName = this.auth.userName || 'Foodie';
    this.fetchLocation();
  }

  fetchLocation() {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
            const data = await res.json();

            // Extract a clean neighborhood/city view
            const town = data.address.suburb || data.address.neighbourhood || data.address.town || data.address.city;
            const state = data.address.state || data.address.country;
            this.userLocation = town ? `${town}, ${state}` : 'Current Location';
            localStorage.setItem('userLocation', this.userLocation);
          } catch (e) {
            this.userLocation = 'Location Unknown';
          }
        },
        (error) => {
          this.userLocation = 'Location Disabled';
        }
      );
    } else {
      this.userLocation = 'Location Unavailable';
    }
  }

  updateGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) this.greeting = 'Good morning';
    else if (hour < 17) this.greeting = 'Good afternoon';
    else this.greeting = 'Good evening';
  }

  async ionViewWillEnter() {
    this.isLoading = true;
    await this.mealService.refreshMeals();
    const userId = this.auth.userId;
    if (userId) {
      await this.wallet.loadWallet(userId);
    }
    await this.loadAiPicks();
    setTimeout(() => {
      this.isLoading = false;
    }, 1000); // Small delay to show off the skeleton
  }

  async loadAiPicks() {
    if (this.meals.length > 0) {
      this.aiPicks = await this.gemini.getMealSuggestions('Give me the best 2 balanced meals for today', this.meals);
    }
  }

  navigateToAi() {
    this.router.navigate(['/ai-concierge']);
  }

  getFilteredMeals(): Meal[] {
    return this.meals.filter(m => m.category === this.selectedCategory);
  }

  addToCart(meal: Meal) {
    this.cartService.addToCart(meal);
  }

  goToCart() {
    this.router.navigate(['/cart']);
  }

  createCustomMeal() {
    // Navigate to custom meal creator (to be implemented)
    this.router.navigate(['/custom-meal']);
    console.log('Navigating to custom meal creator...');
  }

  async openSubscriptionModal() {
    this.router.navigate(['/subscribe']);
  }
}
