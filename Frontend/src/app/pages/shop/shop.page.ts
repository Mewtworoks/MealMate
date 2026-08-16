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
import { ThemeService } from '../../services/theme.service';

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
  get userInitials(): string {
    return this.auth.userInitials;
  }
  userLocation = 'Fetching location...';

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
    private pageLoader: PageLoaderService,
    public themeService: ThemeService
  ) { }

  weekDays: any[] = [];
  weekMealsCompleted = 0;

  ngOnInit() {
    this.mealService.meals$.subscribe(m => this.meals = m);
    this.agents = this.mealService.getAgents();

    this.wallet.balance$.subscribe(b => this.walletBalance = b);
    this.wallet.credits$.subscribe(c => this.credits = c);

    this.cartService.cart$.subscribe(items => {
      this.cartCount = items.reduce((sum: number, i: any) => sum + (Number(i.quantity) || 1), 0);
      this.cartItems = items;
      this.cartTotal = this.cartService.getCartTotal();
    });

    this.greeting = this.auth.greeting;
    this.userName = this.auth.userName || 'Foodie';
    this.fetchLocation();
    this.buildWeekDays();
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
    } else {
      this.buildWeekDays();
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
    this.buildWeekDays();
  }

  buildWeekDays() {
    const dayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const today = new Date();
    const todayDay = today.getDay();
    const mappedToday = todayDay === 0 ? 6 : todayDay - 1; // 0=Mon, 6=Sun

    if (!this.activeSubscription) {
      // Default dynamic visualization when no sub: Mon..Wed completed, Thu today
      this.weekDays = dayNames.map((name, i) => ({
        short: name,
        completed: i < mappedToday,
        isToday: i === mappedToday
      }));
      this.weekMealsCompleted = mappedToday;
      return;
    }

    const todayDateLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const start = new Date(this.activeSubscription.startDate);
    const startDateLocal = new Date(start.getFullYear(), start.getMonth(), start.getDate());

    const mondayDate = new Date(todayDateLocal);
    mondayDate.setDate(todayDateLocal.getDate() - mappedToday);

    this.weekDays = dayNames.map((name, i) => {
      const dayDate = new Date(mondayDate);
      dayDate.setDate(mondayDate.getDate() + i);
      const dateStr = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;

      const isSkipped = this.activeSubscription?.skippedDays?.includes(dateStr) || false;
      const isPaused = this.activeSubscription?.pausedDays?.includes(dateStr) || this.activeSubscription?.status === 'Paused';
      const isToday = i === mappedToday;

      let completed = false;
      if (dayDate.getTime() < todayDateLocal.getTime()) {
        completed = dayDate.getTime() >= startDateLocal.getTime() && !isSkipped && !isPaused;
      } else if (isToday) {
        completed = today.getHours() >= 13 && !isSkipped && !isPaused;
      }

      return {
        short: name,
        completed,
        isToday
      };
    });

    this.weekMealsCompleted = this.weekDays.filter(d => d.completed).length;
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
  currentDomIndex = 1;
  autoSlideTimer: any = null;
  scrollDebounceTimer: any = null;

  ionViewDidEnter() {
    setTimeout(() => {
      this.scrollToDomIndex(1, 'auto');
    }, 100);
    this.startAutoSlide();
  }

  ionViewWillLeave() {
    this.stopAutoSlide();
  }

  ngOnDestroy() {
    this.stopAutoSlide();
  }

  isSlideActive(domIndex: number): boolean {
    return ((domIndex - 1 + 4) % 4) === this.activeSlideIndex;
  }

  startAutoSlide() {
    this.stopAutoSlide();
    this.autoSlideTimer = setInterval(() => {
      this.currentDomIndex++;
      this.scrollToDomIndex(this.currentDomIndex, 'smooth');

      if (this.currentDomIndex >= 5) {
        this.activeSlideIndex = 0;
        setTimeout(() => {
          this.currentDomIndex = 1;
          this.scrollToDomIndex(1, 'auto');
        }, 400);
      } else {
        this.activeSlideIndex = (this.currentDomIndex - 1 + 4) % 4;
      }
    }, 4000);
  }

  stopAutoSlide() {
    if (this.autoSlideTimer) {
      clearInterval(this.autoSlideTimer);
      this.autoSlideTimer = null;
    }
  }

  getSlideStep(el: HTMLElement): number {
    const firstSlide = el.querySelector('.ms-slide') as HTMLElement;
    if (firstSlide && firstSlide.offsetWidth > 0) {
      return firstSlide.offsetWidth + 12;
    }
    return el.clientWidth * 0.84 + 12;
  }

  onMobileSliderScroll(event: Event) {
    const el = event.target as HTMLElement;
    if (!el || el.clientWidth === 0) return;

    const step = this.getSlideStep(el);
    const scrollPos = el.scrollLeft;
    const domIndex = Math.round(scrollPos / step);

    this.currentDomIndex = domIndex;
    if (domIndex === 0) {
      this.activeSlideIndex = 3;
    } else if (domIndex >= 5) {
      this.activeSlideIndex = 0;
    } else {
      this.activeSlideIndex = Math.min(3, Math.max(0, domIndex - 1));
    }

    if (this.scrollDebounceTimer) clearTimeout(this.scrollDebounceTimer);
    this.scrollDebounceTimer = setTimeout(() => {
      if (this.currentDomIndex <= 0) {
        this.currentDomIndex = 4;
        this.scrollToDomIndex(4, 'auto');
      } else if (this.currentDomIndex >= 5) {
        this.currentDomIndex = 1;
        this.scrollToDomIndex(1, 'auto');
      }
    }, 150);
  }

  scrollToSlide(realIndex: number) {
    this.activeSlideIndex = realIndex;
    this.currentDomIndex = realIndex + 1;
    this.scrollToDomIndex(this.currentDomIndex, 'smooth');
    this.startAutoSlide();
  }

  scrollToDomIndex(domIndex: number, behavior: ScrollBehavior = 'smooth') {
    const el = document.querySelector('.mobile-slider') as HTMLElement;
    if (el) {
      const step = this.getSlideStep(el);
      el.scrollTo({ left: domIndex * step, behavior });
    }
  }
}
