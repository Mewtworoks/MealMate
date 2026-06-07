import { Component, OnInit } from '@angular/core';
import { MealService, Meal } from '../../services/meal.service';
import { CartService } from '../../services/cart.service';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-all-meals',
  templateUrl: './all-meals.page.html',
  styleUrls: ['./all-meals.page.scss'],
  standalone: false
})
export class AllMealsPage implements OnInit {
  meals: Meal[] = [];
  filteredMeals: Meal[] = [];
  categories: string[] = ['All', 'Lunch', 'Healthy', 'North Indian', 'Trending', 'Bestseller'];
  selectedCategory: string = 'All';
  searchTerm: string = '';
  cartCount: number = 0;
  isLoading: boolean = true;

  constructor(
    private mealService: MealService,
    public cartService: CartService,
    private router: Router,
    private navCtrl: NavController
  ) { }

  ngOnInit() {
    // Subscribe to meals
    this.mealService.meals$.subscribe(m => {
      this.meals = m;
      this.filterMeals();
    });

    // Subscribe to cart changes
    this.cartService.cart$.subscribe(items => {
      this.cartCount = items.length;
    });
  }

  ionViewWillEnter() {
    this.isLoading = true;
    this.mealService.refreshMeals().then(() => {
      this.filterMeals();
      setTimeout(() => {
        this.isLoading = false;
      }, 600); // Small loading indicator delay for premium feel
    });
  }

  selectCategory(category: string) {
    this.selectedCategory = category;
    this.filterMeals();
  }

  onSearchChange() {
    this.filterMeals();
  }

  filterMeals() {
    let result = this.meals;

    // Filter by Category
    if (this.selectedCategory !== 'All') {
      // In this app, Bestseller and Trending are visual properties or category fallbacks
      if (this.selectedCategory === 'Trending' || this.selectedCategory === 'Bestseller') {
        // Just show a subset of meals as Trending/Bestseller for demo variety
        result = this.meals.slice(0, Math.ceil(this.meals.length / 2));
      } else {
        result = this.meals.filter(m => m.category === this.selectedCategory);
      }
    }

    // Filter by Search Term
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      result = result.filter(m => 
        m.name.toLowerCase().includes(term) || 
        (m.category && m.category.toLowerCase().includes(term))
      );
    }

    this.filteredMeals = result;
  }

  getMealRating(meal: Meal): string {
    return `4.${(meal.price % 5) + 5}`;
  }

  getMealKcal(meal: Meal): string {
    return `${380 + (meal.price % 120)} kcal`;
  }

  addToCart(meal: Meal, event: Event) {
    event.stopPropagation(); // Avoid triggering card click or redirect if any
    this.cartService.addToCart(meal);
  }

  removeFromCart(mealId: string, event: Event) {
    event.stopPropagation();
    this.cartService.removeFromCart(mealId);
  }

  goToCart() {
    this.router.navigate(['/cart']);
  }

  goBack() {
    this.navCtrl.back();
  }
}
