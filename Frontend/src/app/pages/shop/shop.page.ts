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
  categories = ['All', 'Lunch', 'Thali', 'Biryani', 'Non-Veg', 'Healthy'];
  selectedCategory = 'All';
  isLoading = true;
  searchQuery = '';
  orderCount = 0;

  activeSubscription: Subscription | null = null;
  activePlanPercent: number = 0;
  planName: string = 'Protein Focus Plan';
  planMessage: string = 'Great going! You\'re on track with your protein goals.';

  walletBalance = 0;
  credits = 0;
  cartCount = 0;
  cartItems: any[] = [];
  cartTotal = 0;

  selectedAddress = { tag: 'Kalkaji', street: 'New Delhi' };
  unreadNotifCount = 2;

  openAddressModal() {
    // Address modal trigger placeholder
  }

  openNotifications() {
    // Notification drawer/modal trigger placeholder
  }

  onSearchInput(event: any) {
    this.searchQuery = event.target?.value || '';
    this.onSearch();
  }

  greeting = 'Good morning';
  userName = 'Foodie';
  userInitials = 'F';
  userLocation = 'Fetching location...';
  weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  getCategoryIcon(category: string): string {
    const icons: { [key: string]: string } = {
      'All': 'restaurant-outline',
      'Lunch': 'restaurant-outline',
      'Healthy': 'leaf-outline',
      'Thali': 'flame-outline',
      'Biryani': 'flame-outline',
      'Non-Veg': 'fish-outline',
      'Trending': 'trending-up-outline',
      'Bestseller': 'star-outline',
    };
    return icons[category] || 'restaurant-outline';
  }

  getMealCalories(meal: Meal): number {
    return this.mealService.getMealCalories(meal);
  }

  getMatchPercent(index: number): number {
    const percents = [92, 86, 85, 83, 80];
    return percents[index] || 80;
  }

  getPickMeals(): Meal[] {
    if (this.aiPicks && this.aiPicks.length > 0) return this.aiPicks.slice(0, 3);
    return this.meals.slice(0, 3);
  }

  getNextDeliveryText(sub: Subscription | null): string {
    if (!sub) return '';
    if (sub.status === 'Paused') return 'Paused - Resume to continue';
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    const tmrwStr = tmrw.toISOString().split('T')[0];
    if (sub.skippedDays?.includes(tmrwStr) || sub.pausedDays?.includes(tmrwStr)) {
      return 'Next unskipped day, 1:00 PM';
    }
    return 'Tomorrow, 1:00 PM';
  }

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
      this.cartCount = items.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0);
      this.cartItems = items;
      this.cartTotal = items.reduce((sum: number, i: any) => sum + (i.price * (i.quantity || 1)), 0);
    });

    this.greeting = this.auth.greeting;
    this.userName = this.auth.userName || 'Foodie';
    this.userInitials = this.userName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
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
            const town = data.address.suburb || data.address.neighbourhood || data.address.town || data.address.city;
            const state = data.address.state || data.address.country;
            this.userLocation = town ? `${town}, ${state}` : 'Current Location';
            localStorage.setItem('userLocation', this.userLocation);
          } catch (e) {
            this.userLocation = 'Location Unknown';
          }
        },
        () => { this.userLocation = 'Location Disabled'; }
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
    this.loadAiPicks();
    setTimeout(() => {
      this.isLoading = false;
      this.pageLoader.show(false);
    }, 1000);
  }

  checkActiveSubscription(userId: string) {
    const subs = this.subscriptionService.getUserSubscriptions(userId);
    const activeSub = subs.find(s => s.status === 'Active');
    if (activeSub) {
      this.activeSubscription = activeSub;
      const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);
      const startDate = new Date(activeSub.startDate); startDate.setHours(0, 0, 0, 0);
      const daysElapsed = Math.floor((todayDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      let percent = Math.floor((daysElapsed / activeSub.totalDays) * 100);
      this.activePlanPercent = Math.max(0, Math.min(100, percent));
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
    if (cachedPicksStr && cachedDate === today) {
      try { this.aiPicks = JSON.parse(cachedPicksStr); return; } catch (e) { }
    }
    try {
      this.aiPicks = await this.gemini.getMealSuggestions('Give me the best 3 balanced meals for today', this.meals);
      if (this.aiPicks && this.aiPicks.length > 0) {
        localStorage.setItem('dailyAiPicks', JSON.stringify(this.aiPicks));
        localStorage.setItem('dailyAiPicksDate', today);
      }
    } catch (e) { console.error('AI Suggestion Error:', e); }
  }

  onSearch() {
    // Search triggers re-render via getFilteredMeals()
  }

  navigateToAi() { this.router.navigate(['/ai-concierge']); }

  getFilteredMeals(): Meal[] {
    if (!this.meals || this.meals.length === 0) return [];
    let list = this.meals;

    // Category filter
    if (this.selectedCategory !== 'All') {
      const cat = this.selectedCategory;
      if (cat === 'Non-Veg') {
        list = list.filter(m => m.type === 'Non-Veg' || m.category === 'Non-Veg Thali');
      } else if (cat === 'Healthy') {
        list = list.filter(m => m.type === 'Veg' || (m.calories && m.calories <= 450));
      } else {
        let matches = list.filter(m => m.category === cat);
        if (cat === 'Lunch') {
          const extra = list.filter(m => ['Thali', 'Non-Veg Thali', 'Biryani'].includes(m.category));
          matches = Array.from(new Set([...matches, ...extra]));
        }
        list = matches.length > 0 ? matches : list;
      }
    }

    // Search filter
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(m => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q));
    }

    return list;
  }

  addToCart(meal: Meal, event?: Event) {
    if (event) event.stopPropagation();
    this.cartService.addToCart(meal);
  }

  removeFromCart(mealId: string, event: Event) {
    event.stopPropagation();
    this.cartService.removeFromCart(mealId);
  }

  goToCart() { this.router.navigate(['/cart']); }
  createCustomMeal() { this.router.navigate(['/custom-meal']); }
  async openSubscriptionModal() { this.router.navigate(['/subscribe']); }
  goToMealDetail(mealId: string) { this.router.navigate(['/meal-detail', mealId]); }

  activeSlideIndex = 0;
  autoSlideTimer: any = null;

  ionViewDidEnter() {
    this.startAutoSlide();
  }

  ionViewWillLeave() {
    this.stopAutoSlide();
  }

  ngOnDestroy() {
    this.stopAutoSlide();
  }

  startAutoSlide() {
    this.stopAutoSlide();
    this.autoSlideTimer = setInterval(() => {
      this.activeSlideIndex = (this.activeSlideIndex + 1) % 4;
      this.scrollToSlide(this.activeSlideIndex);
    }, 4000);
  }

  stopAutoSlide() {
    if (this.autoSlideTimer) {
      clearInterval(this.autoSlideTimer);
      this.autoSlideTimer = null;
    }
  }

  onMobileSliderScroll(event: Event) {
    const el = event.target as HTMLElement;
    if (el && el.clientWidth > 0) {
      const scrollPosition = el.scrollLeft;
      const slideWidth = el.clientWidth * 0.85;
      this.activeSlideIndex = Math.min(3, Math.max(0, Math.round(scrollPosition / slideWidth)));
    }
  }

  scrollToSlide(index: number) {
    this.activeSlideIndex = index;
    const el = document.querySelector('.mobile-slider') as HTMLElement;
    if (el) {
      const slideWidth = el.clientWidth * 0.85;
      el.scrollTo({ left: index * slideWidth, behavior: 'smooth' });
    }
    this.startAutoSlide();
  }
}
