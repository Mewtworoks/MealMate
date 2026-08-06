import { Component, OnInit } from '@angular/core';
import { OrderService, Order } from '../../services/order.service';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { AuthService } from '../../services/auth';
import { SubscriptionService, Subscription, RotationMeal } from '../../services/subscription.service';

import { MealService } from '../../services/meal.service';

@Component({
  selector: 'app-my-orders',
  templateUrl: './my-orders.page.html',
  styleUrls: ['./my-orders.page.scss'],
  standalone: false
})
export class MyOrdersPage implements OnInit {
  orders: Order[] = [];
  subscriptions: Subscription[] = [];
  activeTab: 'active' | 'past' | 'subscriptions' = 'active';

  // UI state for schedule view
  viewingScheduleFor: string | null = null;
  scheduleView: any[] = [];

  constructor(
    private orderService: OrderService,
    private mealService: MealService,
    private auth: AuthService,
    private router: Router,
    private navCtrl: NavController,
    private subscriptionService: SubscriptionService
  ) { }

  async ngOnInit() {
    this.loadOrdersData();
  }

  async ionViewWillEnter() {
    this.loadOrdersData();
  }

  private async loadOrdersData() {
    const userId = this.auth.userId;
    if (userId) {
      this.orderService.refreshUserOrders(userId);
      await this.subscriptionService.fetchUserSubscriptions(userId);
    }

    this.subscriptionService.subscriptions$.subscribe(subs => {
      if (userId) {
        this.subscriptions = subs.filter(s => s.customerId === userId);
      }
    });

    this.orderService.orders$.subscribe(orders => {
      this.orders = orders;
      if (this.subscriptions.length > 0 && this.activeOrders.length === 0) {
        this.activeTab = 'subscriptions';
      }
    });
  }

  get activeOrders(): Order[] {
    return this.orders.filter(o => !o.subscriptionId && !['Delivered', 'Rejected'].includes(o.status));
  }

  get pastOrders(): Order[] {
    return this.orders.filter(o => !o.subscriptionId && ['Delivered', 'Rejected'].includes(o.status));
  }

  // --- Subscription Logic ---

  getTodaysMeal(sub: Subscription): RotationMeal {
    return this.subscriptionService.getTodaysMeal(sub);
  }

  getNextMeal(sub: Subscription): RotationMeal {
    const start = new Date(sub.startDate);
    start.setHours(0, 0, 0, 0);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    let dayNumber = Math.floor((tomorrow.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (dayNumber < 0) dayNumber = 0;

    return sub.rotationMeals[dayNumber % sub.rotationMeals.length];
  }

  getDaysElapsed(sub: Subscription): number {
    const start = new Date(sub.startDate);
    start.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let elapsed = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (elapsed < 1) elapsed = 1;
    return elapsed;
  }

  getDaysRemaining(sub: Subscription): number {
    return sub.totalDays - this.getDaysElapsed(sub);
  }

  async togglePause(sub: Subscription) {
    if (sub.status === 'Active') {
      await this.subscriptionService.pauseSubscription(sub.id);
    } else if (sub.status === 'Paused') {
      await this.subscriptionService.resumeSubscription(sub.id);
    }
  }

  viewSchedule(sub: Subscription) {
    if (this.viewingScheduleFor === sub.id) {
      this.viewingScheduleFor = null;
    } else {
      this.viewingScheduleFor = sub.id;
      this.scheduleView = this.subscriptionService.getSchedule(sub);
    }
  }

  // -------------------------
  // UI Formatters delegated to shared service
  getStatusIcon(status: string): string {
    return this.orderService.getStatusIcon(status);
  }

  getStatusLabel(status: string): string {
    return this.orderService.getStatusLabel(status);
  }

  getOrderImage(order: Order, index: number): string {
    if (order.items && order.items.length > 0) {
      const item = order.items[0];
      const name = item.mealName || item.MealName || item.name || item.Name || '';
      const img = item.imageUrl || item.ImageUrl || '';
      return this.mealService.mapMealImage(img, name);
    }
    return this.orderService.getMealFallbackImage(index);
  }

  onOrderClick(order: Order) {
    if (order.status === 'OutForDelivery') {
      this.router.navigate(['/live-tracking'], { queryParams: { orderId: order.id } });
    } else {
      this.router.navigate(['/order-details', order.id]);
    }
  }

  goToShop() {
    this.router.navigate(['/customer-home']);
  }

  goBack() {
    this.navCtrl.back();
  }
}
