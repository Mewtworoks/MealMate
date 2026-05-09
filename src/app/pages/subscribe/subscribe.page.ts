import { Component, OnInit } from '@angular/core';
import { ToastController, AlertController, NavController } from '@ionic/angular';
import { MealService, Meal } from '../../services/meal.service';
import { Router } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { AuthService } from '../../services/auth';
import { WalletService } from '../../services/wallet.service';
import { SubscriptionService } from '../../services/subscription.service';

@Component({
  selector: 'app-subscribe',
  templateUrl: './subscribe.page.html',
  styleUrls: ['./subscribe.page.scss'],
  standalone: false
})
export class SubscribePage implements OnInit {
  meals: Meal[] = [];
  selectedMeals: Meal[] = [];
  months = 1;
  basePricePerMeal = 110;
  isPlacingOrder = false;

  constructor(
    private mealService: MealService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private router: Router,
    private navCtrl: NavController,
    private orderService: OrderService,
    private auth: AuthService,
    private wallet: WalletService,
    private subscriptionService: SubscriptionService
  ) {}

  ngOnInit() {
    this.meals = this.mealService.getMeals().filter((m: Meal) => m.category === 'Lunch' || m.category === 'Dinner');
  }

  goBack() {
    this.navCtrl.back();
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
    let total = this.basePricePerMeal * 30 * this.months;
    if (this.months === 3) total *= 0.9; 
    if (this.months === 6) total *= 0.8; 
    return Math.round(total);
  }

  async subscribe() {
    if (this.selectedMeals.length === 0) {
      this.showToast('Please select at least 1 meal');
      return;
    }

    const userId = this.auth.userId;
    if (!userId) {
      this.showToast('You must be logged in to subscribe.');
      this.router.navigate(['/login']);
      return;
    }

    const finalTotal = this.getTotalPrice;
    if (!this.wallet.canAfford(finalTotal, false)) {
      const deficit = Math.max(0, finalTotal - (this.wallet.balance + this.wallet.availableCredit));
      const alert = await this.alertCtrl.create({
        header: 'Insufficient Funds',
        message: `Your balance + credit is not enough for this subscription. You need ₹${deficit.toFixed(0)} more.`,
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    this.isPlacingOrder = true;

    try {
      const rotationMeals = this.selectedMeals.map(m => ({ mealId: m.id, name: m.name, price: m.price }));
      
      await this.subscriptionService.createSubscription({
        customerId: userId,
        months: this.months,
        rotationMeals: rotationMeals,
        startDate: new Date(),
        totalPaid: finalTotal
      });

      this.wallet.deductBalance(finalTotal);

      let message = 'Subscription Activated! 🎉';
      await this.showToast(message);
      this.router.navigate(['/my-orders']);
    } catch (error: any) {
      const errorMsg = error?.error || error?.message || 'Could not connect to the server.';
      const alert = await this.alertCtrl.create({
        header: 'Subscription Failed',
        message: typeof errorMsg === 'string' ? errorMsg : 'Something went wrong.',
        buttons: ['OK']
      });
      await alert.present();
    } finally {
      this.isPlacingOrder = false;
    }
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
