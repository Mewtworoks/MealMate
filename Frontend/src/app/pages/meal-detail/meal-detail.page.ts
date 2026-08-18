import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MealService, Meal, Agent } from '../../services/meal.service';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth';
import { SubscriptionService, Subscription } from '../../services/subscription.service';
import { PageLoaderService } from '../../services/page-loader.service';
import { NavController, ToastController } from '@ionic/angular';
import { ThemeService } from '../../services/theme.service';

import { OrderService } from '../../services/order.service';
import { ReviewService, MealReview } from '../../services/review.service';

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
  hasOrderedMeal: boolean = false;

  userRating: number = 5;
  userComment: string = '';
  isSubmittingReview: boolean = false;

  get isFavorite(): boolean {
    return this.isFavorited;
  }

  get userName(): string {
    return this.auth.userName || 'MealMate User';
  }

  get userInitials(): string {
    return this.auth.userInitials;
  }

  shareMeal() {
    this.shareItem();
  }

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
    private subscriptionService: SubscriptionService,
    private orderService: OrderService,
    private pageLoader: PageLoaderService,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    public themeService: ThemeService,
    public reviewService: ReviewService
  ) { }

  ngOnInit() {
    const mealId = this.route.snapshot.paramMap.get('id');
    if (mealId) {
      this.loadMealDetail(mealId);
    }
  }

  async loadMealDetail(mealId: string) {
    this.isLoading = true;
    this.pageLoader.show(true);
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

      if (this.similarMeals.length < 3) {
        const others = meals.filter(m => m.id !== this.meal!.id && !this.similarMeals.find(s => s.id === m.id));
        this.similarMeals = [...this.similarMeals, ...others].slice(0, 4);
      }

      this.generateMealDetails();
      this.loadReviews();
      this.generateAiMatch();

      const userId = this.auth.userId;
      if (userId) {
        await this.subscriptionService.fetchUserSubscriptions(userId);
        const subs = this.subscriptionService.getUserSubscriptions(userId);
        this.activeSubscription = subs.find(s => s.status === 'Active') || null;
      }

      await this.checkIfUserOrderedMeal(mealId);
    }

    this.isLoading = false;
    this.pageLoader.show(false);
  }

  private async checkIfUserOrderedMeal(mealId: string) {
    const userId = this.auth.userId;
    if (!userId) {
      this.hasOrderedMeal = false;
      return;
    }

    let orders = this.orderService.getOrders();
    if (!orders || orders.length === 0) {
      orders = await this.orderService.refreshUserOrders(userId);
    }

    const subs = this.subscriptionService.getUserSubscriptions(userId);
    const hasSub = subs && subs.some(s => s.status === 'Active');

    const orderedInOrders = orders.some(o =>
      o.items && o.items.some((i: any) =>
        i.mealId === mealId ||
        (i.mealName && this.meal && i.mealName.toLowerCase().trim() === this.meal.name.toLowerCase().trim()) ||
        (i.name && this.meal && i.name.toLowerCase().trim() === this.meal.name.toLowerCase().trim())
      )
    );

    this.hasOrderedMeal = orderedInOrders || hasSub;
  }

  private generateMealDetails() {
    if (!this.meal) return;

    this.prepTime = this.meal.prepTime || '25 min';
    this.portionSize = this.meal.portionSize || '350g';

    if (this.meal.ingredients) {
      this.ingredients = this.meal.ingredients.split(',').map(s => s.trim()).filter(s => s);
    } else {
      this.ingredients = ['Fresh Spices', 'Olive Oil', 'Himalayan Salt', 'Fresh Herbs'];
    }

    if (this.meal.allergens) {
      this.allergens = this.meal.allergens.split(',').map(s => s.trim()).filter(s => s);
    } else {
      this.allergens = [];
    }
  }

  loadReviews() {
    if (!this.meal) return;
    const revs = this.reviewService.getReviewsForMeal(this.meal.id);
    this.reviews = revs.map(r => ({
      name: r.userName,
      avatar: r.userAvatarBg,
      rating: r.rating,
      comment: r.comment,
      date: r.date
    }));
  }

  setRating(star: number) {
    this.userRating = star;
  }

  async submitReview() {
    if (!this.meal) return;
    if (!this.userComment || !this.userComment.trim()) {
      const toast = await this.toastCtrl.create({
        message: 'Please write your feedback before submitting! 💬',
        duration: 2000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    this.isSubmittingReview = true;
    this.reviewService.addReview({
      mealId: this.meal.id,
      mealName: this.meal.name,
      agentId: this.meal.agentId,
      userId: this.auth.userId || undefined,
      userName: this.auth.userName || 'MealMate User',
      rating: this.userRating,
      comment: this.userComment.trim()
    });

    this.loadReviews();
    this.userComment = '';
    this.isSubmittingReview = false;

    const toast = await this.toastCtrl.create({
      message: 'Thank you for your feedback! ⭐ Review published.',
      duration: 2500,
      color: 'success',
      icon: 'star'
    });
    await toast.present();
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

  getMealCalories(meal: Meal): number {
    return meal?.calories || 420;
  }

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
    if (!this.meal) return '4.8';
    return this.reviewService.getAverageRatingForMeal(this.meal.id).rating;
  }

  get reviewCount(): number {
    if (!this.meal) return 42;
    return this.reviewService.getAverageRatingForMeal(this.meal.id).count;
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

  async toggleFavorite() {
    this.isFavorited = !this.isFavorited;
    const toast = await this.toastCtrl.create({
      message: this.isFavorited ? 'Saved to favorites ❤️' : 'Removed from favorites',
      duration: 2000,
      position: 'top',
      color: 'dark'
    });
    await toast.present();
  }

  async addToCart() {
    if (!this.meal) return;
    for (let i = 0; i < this.quantity; i++) {
      this.cartService.addToCart(this.meal);
    }

    const toast = await this.toastCtrl.create({
      message: `${this.quantity}x ${this.meal.name} added to cart!`,
      duration: 2000,
      position: 'bottom',
      color: 'success',
      icon: 'checkmark-circle'
    });
    await toast.present();

    this.navCtrl.back();
  }

  async addToRotation() {
    if (!this.meal || !this.activeSubscription) return;
    this.subscriptionService.addMealToPool(this.activeSubscription.id, {
      mealId: this.meal.id,
      name: this.meal.name,
      price: this.meal.price
    });

    const toast = await this.toastCtrl.create({
      message: `${this.meal.name} added to your rotation! 🔄`,
      duration: 2500,
      position: 'bottom',
      color: 'success'
    });
    await toast.present();
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
    this.navCtrl.back();
  }

  async quickAdd(meal: Meal) {
    this.cartService.addToCart(meal);
    const toast = await this.toastCtrl.create({
      message: `1x ${meal.name} added to cart!`,
      duration: 2000,
      position: 'bottom',
      color: 'success'
    });
    await toast.present();
  }

  async shareItem() {
    if (navigator.share && this.meal) {
      try {
        await navigator.share({
          title: this.meal.name,
          text: `Check out ${this.meal.name} on MealMate!`,
          url: window.location.href
        });
      } catch (err) {
        console.log('Share cancelled or failed', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      const toast = await this.toastCtrl.create({
        message: 'Link copied to clipboard! 🔗',
        duration: 2000,
        position: 'top',
        color: 'dark'
      });
      await toast.present();
    }
  }
}
