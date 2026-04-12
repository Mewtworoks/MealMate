import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { MealService, Meal, Agent } from '../../services/meal.service';
import { CartService } from '../../services/cart.service';
import { WalletService } from '../../services/wallet.service';
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

  constructor(
    private mealService: MealService,
    public cartService: CartService,
    public wallet: WalletService,
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
  }

  async ionViewWillEnter() {
    await this.mealService.refreshMeals();
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
      breakpoints: [0, 0.9],
      initialBreakpoint: 0.9,
      cssClass: 'premium-modal'
    });
    return await modal.present();
  }
}
