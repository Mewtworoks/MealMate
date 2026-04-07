import { Component, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { MealService, Meal } from '../../services/meal.service';
import { Router } from '@angular/router';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-subscription-modal',
  templateUrl: './subscription-modal.component.html',
  styleUrls: ['./subscription-modal.component.scss'],
  standalone: false
})
export class SubscriptionModalComponent implements OnInit {
  meals: Meal[] = [];
  selectedMeals: Meal[] = [];
  months = 1;
  basePricePerMeal = 110;

  constructor(
    private modalCtrl: ModalController,
    private mealService: MealService,
    private toastCtrl: ToastController,
    private router: Router,
    private orderService: OrderService
  ) {}

  ngOnInit() {
    this.meals = this.mealService.getMeals().filter(m => m.category === 'Lunch' || m.category === 'Dinner');
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  toggleMealSelection(meal: Meal) {
    const index = this.selectedMeals.findIndex(m => m.id === meal.id);
    if (index > -1) {
      this.selectedMeals.splice(index, 1);
    } else {
      if (this.selectedMeals.length < 3) {
        this.selectedMeals.push(meal);
      } else {
        this.showToast('You can select up to 3 meals for rotation');
      }
    }
  }

  isSelected(meal: Meal): boolean {
    return this.selectedMeals.some(m => m.id === meal.id);
  }

  get getTotalPrice(): number {
    // Basic calculation: base price * 30 days * months * (discount for multiple months)
    let total = this.basePricePerMeal * 30 * this.months;
    if (this.months === 3) total *= 0.9; // 10% off for 3 months
    if (this.months === 6) total *= 0.8; // 20% off for 6 months
    return Math.round(total);
  }

  get getDiscountText(): string {
     if (this.months === 3) return 'Save 10%';
     if (this.months === 6) return 'Save 20%';
     return '';
  }

  async subscribe() {
    if (this.selectedMeals.length === 0) {
      this.showToast('Please select at least 1 meal');
      return;
    }

    // Process subscription payment...
    // Let's create a subscription order
    this.orderService.addOrder({
        id: 'SUB-' + Math.floor(Math.random() * 8999 + 1000),
        date: new Date().toISOString(),
        total: this.getTotalPrice,
        items: this.selectedMeals.map(m => ({ meal: m, quantity: 1, total: m.price, discountedTotal: m.price })),
        status: 'Accepted',
        creditUsed: 0,
        amountDue: 0,
        subscriptionId: `SUB-${this.months}MO`
    });

    await this.showToast('Subscription Activated! 🎉');
    this.modalCtrl.dismiss({ subscribed: true });
    this.router.navigate(['/my-orders']);
  }

  async showToast(msg: string) {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 2500,
      position: 'bottom'
    });
    toast.present();
  }
}
