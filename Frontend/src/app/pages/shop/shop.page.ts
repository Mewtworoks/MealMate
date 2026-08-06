import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { MealService, Meal, Agent } from '../../services/meal.service';
import { CartService } from '../../services/cart.service';
import { WalletService } from '../../services/wallet.service';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';
import { SubscriptionService, Subscription } from '../../services/subscription.service';
import { Gemini } from '../../services/gemini';
import { PageLoaderService } from '../../services/page-loader.service';

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
  categories = ['Lunch', 'Healthy', 'North Indian', 'Trending', 'Bestseller', 'More'];
  selectedCategory = 'Lunch';
  isLoading = true;

  activeSubscription: Subscription | null = null;
  activePlanPercent: number = 0;
  planName: string = 'Protein Focus Plan';
  planMessage: string = 'Great going! You\'re on track with your protein goals.';

  getCategoryIcon(category: string): string {
    const icons: { [key: string]: string } = {
      'Lunch': 'restaurant-outline',
      'Healthy': 'leaf-outline',
      'North Indian': 'flame-outline',
      'Trending': 'trending-up-outline',
      'Bestseller': 'star-outline',
      'More': 'grid-outline'
    };
    return icons[category] || 'restaurant-outline';
  }

  getMealCalories(meal: Meal): number {
    return this.mealService.getMealCalories(meal);
  }

  getNextDeliveryText(sub: Subscription | null): string {
    if (!sub) return '';
    if (sub.status === 'Paused') {
      return 'Paused - Resume to continue';
    }
    
    // Simplistic logic: assume next delivery is tomorrow if active
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    
    // Check if tomorrow is paused or skipped
    const tmrwStr = tmrw.toISOString().split('T')[0];
    if (sub.skippedDays?.includes(tmrwStr) || sub.pausedDays?.includes(tmrwStr)) {
      return 'Next unskipped day, 1:00 PM';
    }

    return 'Tomorrow, 1:00 PM';
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
    private gemini: Gemini,
    private subscriptionService: SubscriptionService,
    private pageLoader: PageLoaderService
  ) { }

  ngOnInit() {
    this.mealService.meals$.subscribe(m => this.meals = m);
    this.agents = this.mealService.getAgents();

    this.wallet.balance$.subscribe(b => this.walletBalance = b);
    this.wallet.credits$.subscribe(c => this.credits = c);

    this.cartService.cart$.subscribe(items => {
      this.cartCount = items.length;
    });

    this.greeting = this.auth.greeting;
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

  async ionViewWillEnter() {
    this.isLoading = true;
    this.pageLoader.show(true);
    await this.mealService.refreshMeals();
    const userId = this.auth.userId;
    if (userId) {
      await this.wallet.loadWallet(userId);
      await this.subscriptionService.fetchUserSubscriptions(userId);
      this.checkActiveSubscription(userId);
    }
    this.loadAiPicks(); // Removed 'await' so it doesn't block the page load
    setTimeout(() => {
      this.isLoading = false;
      this.pageLoader.show(false);
    }, 1000); // Small delay to show off the loader
  }

  checkActiveSubscription(userId: string) {
    const subs = this.subscriptionService.getUserSubscriptions(userId);
    const activeSub = subs.find(s => s.status === 'Active');
    
    if (activeSub) {
      this.activeSubscription = activeSub;
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      const startDate = new Date(activeSub.startDate);
      startDate.setHours(0, 0, 0, 0);

      const daysElapsed = Math.floor((todayDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let percent = Math.floor((daysElapsed / activeSub.totalDays) * 100);
      if (percent < 0) percent = 0;
      if (percent > 100) percent = 100;
      
      this.activePlanPercent = percent;

      if (activeSub.rotationMeals.some(m => m.name.toLowerCase().includes('paneer'))) {
        this.planName = 'Protein Focus Plan';
        this.planMessage = 'Great going! You\'re on track with your protein goals.';
      } else {
        this.planName = 'Healthy Mix Plan';
        this.planMessage = 'Awesome! You are eating balanced everyday.';
      }
    } else {
      this.activeSubscription = null;
    }
  }

  async loadAiPicks() {
    if (this.meals.length === 0) return;

    const cachedPicksStr = localStorage.getItem('dailyAiPicks');
    const cachedDate = localStorage.getItem('dailyAiPicksDate');
    const today = new Date().toDateString();

    // Use cached AI picks if they were generated today
    if (cachedPicksStr && cachedDate === today) {
      try {
        this.aiPicks = JSON.parse(cachedPicksStr);
        return; // Fast exit!
      } catch (e) {
        console.error('Error parsing cached AI picks', e);
      }
    }

    // Otherwise, call Gemini API in the background
    try {
      this.aiPicks = await this.gemini.getMealSuggestions('Give me the best 2 balanced meals for today', this.meals);
      
      // Save to cache so subsequent loads today are instant
      if (this.aiPicks && this.aiPicks.length > 0) {
        localStorage.setItem('dailyAiPicks', JSON.stringify(this.aiPicks));
        localStorage.setItem('dailyAiPicksDate', today);
      }
    } catch (e) {
      console.error('AI Suggestion Error:', e);
    }
  }

  navigateToAi() {
    this.router.navigate(['/ai-concierge']);
  }

  getFilteredMeals(): Meal[] {
    if (!this.meals || this.meals.length === 0) return [];
    
    const cat = this.selectedCategory;

    if (cat === 'More') {
      return this.meals;
    }

    // Direct category match
    let directMatches = this.meals.filter(m => m.category === cat);

    // Smart fallback/supplement based on filter topic
    if (cat === 'Lunch') {
      const extra = this.meals.filter(m => m.category === 'Thali' || m.category === 'Non-Veg Thali' || m.category === 'Biryani');
      directMatches = Array.from(new Set([...directMatches, ...extra]));
    } else if (cat === 'Healthy') {
      const extra = this.meals.filter(m => m.category === 'Breakfast' || m.type === 'Veg' || (m.calories && m.calories <= 450));
      directMatches = Array.from(new Set([...directMatches, ...extra]));
    } else if (cat === 'North Indian') {
      const extra = this.meals.filter(m => m.category === 'Thali' || m.category === 'Fast Food' || m.name.includes('Paneer') || m.name.includes('Chicken') || m.name.includes('Dal') || m.name.includes('Rajma') || m.name.includes('Saag') || m.name.includes('Chole') || m.name.includes('Kulcha'));
      directMatches = Array.from(new Set([...directMatches, ...extra]));
    } else if (cat === 'Trending') {
      const extra = this.meals.filter(m => m.price >= 200 || m.category === 'Biryani' || m.category === 'Fast Food');
      directMatches = Array.from(new Set([...directMatches, ...extra]));
    } else if (cat === 'Bestseller') {
      const extra = this.meals.filter(m => m.name.includes('Butter') || m.name.includes('Paneer') || m.name.includes('Biryani') || m.name.includes('Chole') || m.name.includes('Dal'));
      directMatches = Array.from(new Set([...directMatches, ...extra]));
    }

    return directMatches.length > 0 ? directMatches : this.meals.slice(0, 6);
  }

  addToCart(meal: Meal, event?: Event) {
    if (event) event.stopPropagation();
    this.cartService.addToCart(meal);
  }

  removeFromCart(mealId: string, event: Event) {
    event.stopPropagation();
    this.cartService.removeFromCart(mealId);
  }

  goToCart() {
    this.router.navigate(['/cart']);
  }

  createCustomMeal() {
    this.router.navigate(['/custom-meal']);
  }

  async openSubscriptionModal() {
    this.router.navigate(['/subscribe']);
  }

  goToMealDetail(mealId: string) {
    this.router.navigate(['/meal-detail', mealId]);
  }
}
