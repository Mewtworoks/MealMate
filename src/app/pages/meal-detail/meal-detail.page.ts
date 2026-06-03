import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MealService, Meal, Agent } from '../../services/meal.service';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth';
import { SubscriptionService, Subscription } from '../../services/subscription.service';

interface Review {
  name: string;
  avatar: string;
  rating: number;
  comment: string;
  date: string;
}

@Component({
  selector: 'app-meal-detail',
  templateUrl: './meal-detail.page.html',
  styleUrls: ['./meal-detail.page.scss'],
  standalone: false
})
export class MealDetailPage implements OnInit {

  meal: Meal | null = null;
  agent: Agent | null = null;
  similarMeals: Meal[] = [];
  quantity: number = 1;
  isLoading: boolean = true;
  isFavorited: boolean = false;

  // Active subscription info
  activeSubscription: Subscription | null = null;

  // AI match data
  aiMatchScore: number = 92;
  aiMatchReasons: string[] = [];

  // Reviews
  reviews: Review[] = [];

  // Derived nutrition/info (computed from meal data or mock)
  prepTime: string = '25 min';
  portionSize: string = '350g';

  // Allergens
  allergens: string[] = [];

  // Ingredients
  ingredients: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private mealService: MealService,
    private cartService: CartService,
    private auth: AuthService,
    private subscriptionService: SubscriptionService
  ) {}

  ngOnInit() {
    const mealId = this.route.snapshot.paramMap.get('id');
    if (mealId) {
      this.loadMealDetail(mealId);
    }
  }

  async loadMealDetail(mealId: string) {
    this.isLoading = true;
    await this.mealService.refreshMeals();
    const meals = this.mealService.getMeals();
    this.meal = meals.find(m => m.id === mealId) || null;

    if (this.meal) {
      // Load agent
      this.agent = this.mealService.getAgentById(this.meal.agentId) || null;

      // Load similar meals (same category, exclude current)
      this.similarMeals = meals
        .filter(m => m.category === this.meal!.category && m.id !== this.meal!.id)
        .slice(0, 4);

      // If not enough similar from same category, fill from others
      if (this.similarMeals.length < 3) {
        const others = meals.filter(m => m.id !== this.meal!.id && !this.similarMeals.find(s => s.id === m.id));
        this.similarMeals = [...this.similarMeals, ...others].slice(0, 4);
      }

      // Generate mock data based on meal properties
      this.generateMealDetails();
      this.generateReviews();
      this.generateAiMatch();

      // Check subscription
      const userId = this.auth.userId;
      if (userId) {
        await this.subscriptionService.fetchUserSubscriptions(userId);
        const subs = this.subscriptionService.getUserSubscriptions(userId);
        this.activeSubscription = subs.find(s => s.status === 'Active') || null;
      }
    }

    this.isLoading = false;
  }

  private generateMealDetails() {
    if (!this.meal) return;

    this.prepTime = this.meal.prepTime || 'N/A';
    this.portionSize = this.meal.portionSize || 'N/A';

    // Ingredients
    if (this.meal.ingredients) {
      this.ingredients = this.meal.ingredients.split(',').map(s => s.trim()).filter(s => s);
    } else {
      this.ingredients = [];
    }

    // Allergens
    if (this.meal.allergens) {
      this.allergens = this.meal.allergens.split(',').map(s => s.trim()).filter(s => s);
    } else {
      this.allergens = [];
    }
  }

  private generateReviews() {
    const names = ['Priya S.', 'Rahul M.', 'Neha K.', 'Amit G.'];
    const comments = [
      'Absolutely delicious! Fresh ingredients and perfect spice level. Will order again.',
      'Great portion size and taste. Reminds me of home-cooked food.',
      'Loved it! The packaging was clean and food was still warm on delivery.',
      'Perfect balance of flavors. My go-to meal for weekday lunches.'
    ];
    const avatarColors = ['#FF7235', '#4CAF50', '#2196F3', '#9C27B0'];

    this.reviews = names.slice(0, 3).map((name, i) => ({
      name,
      avatar: avatarColors[i],
      rating: 4 + (i % 2 === 0 ? 0.5 : 0),
      comment: comments[i],
      date: `${i + 1}d ago`
    }));
  }

  private generateAiMatch() {
    if (!this.meal) return;

    // Generate dynamic match score based only on real meal properties
    const baseScore = 80;
    let score = baseScore;
    const reasons: string[] = [];

    if (this.meal.type === 'Veg') {
      score += 4;
      reasons.push('Matches your vegetarian preference');
    }
    if (this.meal.protein && this.meal.protein > 15) {
      score += 5;
      reasons.push('Fits your High Protein goal');
    }
    if (this.meal.calories && this.meal.calories > 0 && this.meal.calories < 600) {
      score += 4;
      reasons.push('Within your daily calorie target');
    }
    if (this.meal.spiceLevel) {
      score += 3;
      reasons.push(`Matches your ${this.meal.spiceLevel.toLowerCase()} spice level preference`);
    }

    if (reasons.length === 0) {
      reasons.push('Based on your order history');
    }

    this.aiMatchScore = Math.min(score, 98);
    this.aiMatchReasons = reasons;
  }

  // Helpers
  get mealCalories(): number {
    return this.meal?.calories || 0;
  }

  get mealProtein(): number {
    return this.meal?.protein || 0;
  }

  get mealCarbs(): number {
    return this.meal?.carbs || 0;
  }

  get mealFat(): number {
    return this.meal?.fat || 0;
  }

  get mealFiber(): number {
    return this.meal?.fiber || 0;
  }

  get mealRating(): string {
    return (4 + ((this.meal?.price || 100) % 5) / 10 + 0.5).toFixed(1);
  }

  get reviewCount(): number {
    return 40 + ((this.meal?.price || 100) % 60);
  }

  get totalPrice(): number {
    return (this.meal?.price || 0) * this.quantity;
  }

  get spiceLevelLabel(): string {
    return this.meal?.spiceLevel || 'N/A';
  }

  get agentMealsDelivered(): string {
    return (1200 + ((this.agent?.rating || 4.5) * 100)).toFixed(0) + '+';
  }

  // Stars array for ratings
  getStars(rating: number): number[] {
    return Array(5).fill(0).map((_, i) => i < Math.floor(rating) ? 1 : (i < rating ? 0.5 : 0));
  }

  // Actions
  incrementQty() {
    if (this.quantity < 10) this.quantity++;
  }

  decrementQty() {
    if (this.quantity > 1) this.quantity--;
  }

  toggleFavorite() {
    this.isFavorited = !this.isFavorited;
  }

  addToCart() {
    if (!this.meal) return;
    for (let i = 0; i < this.quantity; i++) {
      this.cartService.addToCart(this.meal);
    }
    this.router.navigate(['/cart']);
  }

  addToRotation() {
    if (!this.meal || !this.activeSubscription) return;
    this.subscriptionService.addMealToPool(this.activeSubscription.id, {
      mealId: this.meal.id,
      name: this.meal.name,
      price: this.meal.price
    });
  }

  goToSubscribe() {
    this.router.navigate(['/subscribe']);
  }

  goToMealDetail(mealId: string) {
    this.router.navigate(['/meal-detail', mealId]);
    // Reload data for the new meal
    this.loadMealDetail(mealId);
    // Scroll to top
    const content = document.querySelector('ion-content');
    if (content) (content as any).scrollToTop(300);
  }

  goBack() {
    this.router.navigate(['/customer-home']);
  }

  quickAdd(meal: Meal) {
    this.cartService.addToCart(meal);
  }

  shareItem() {
    if (navigator.share && this.meal) {
      navigator.share({
        title: this.meal.name,
        text: `Check out ${this.meal.name} on MealMate!`,
        url: window.location.href
      });
    }
  }
}
