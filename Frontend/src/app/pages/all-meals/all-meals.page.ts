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
      const cat = this.selectedCategory;
      let directMatches = this.meals.filter(m => m.category === cat);

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

      result = directMatches.length > 0 ? directMatches : this.meals;
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
    return `${this.mealService.getMealCalories(meal)} kcal`;
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
