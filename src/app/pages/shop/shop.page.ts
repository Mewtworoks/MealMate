import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { MealService, Meal, Agent } from '../../services/meal.service';
import { CartService } from '../../services/cart.service';
import { WalletService } from '../../services/wallet.service';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';
import { SubscriptionModalComponent } from '../../components/subscription-modal/subscription-modal.component';

@Component({
  selector: 'app-shop',
  templateUrl: './shop.page.html',
  styleUrls: ['./shop.page.scss'],
  standalone: false
})
export class ShopPage implements OnInit {
  meals: Meal[] = [];
  agents: Agent[] = [];
  categories = ['Lunch', 'Thali', 'Fast Food', 'Drinks', 'Breakfast', 'Dinner'];
  selectedCategory = 'Lunch';

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
    private modalCtrl: ModalController
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
    await this.mealService.refreshMeals();
    const userId = this.auth.userId;
    if (userId) {
      this.wallet.loadWallet(userId);
    }
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
    const modal = await this.modalCtrl.create({
      component: SubscriptionModalComponent,
      breakpoints: [0, 1],
      initialBreakpoint: 1,
      cssClass: 'premium-modal'
    });
    return await modal.present();
  }
}
