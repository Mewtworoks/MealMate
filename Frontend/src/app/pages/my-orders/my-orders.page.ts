import { Component, OnInit } from '@angular/core';
import { OrderService, Order } from '../../services/order.service';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { AuthService } from '../../services/auth';
import { SubscriptionService, Subscription, RotationMeal } from '../../services/subscription.service';

import { MealService } from '../../services/meal.service';
import { ThemeService } from '../../services/theme.service';

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
  isLoading: boolean = false;

  // UI state for schedule & order selection
  selectedOrder: Order | null = null;
  searchQuery: string = '';
  statusFilter: string = 'all';
  selectedSubscription: Subscription | null = null;
  viewingScheduleFor: string | null = null;
  scheduleView: any[] = [];

  constructor(
    private orderService: OrderService,
    private mealService: MealService,
    private auth: AuthService,
    private router: Router,
    private navCtrl: NavController,
    private subscriptionService: SubscriptionService,
    public themeService: ThemeService
  ) { }

  get userName(): string {
    return this.auth.userName || 'MealMate User';
  }

  get userInitials(): string {
    return this.auth.userInitials;
  }

  async ngOnInit() {
    this.loadOrdersData();
  }

  async ionViewWillEnter() {
    this.activeTab = 'active';
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
      if (orders.length > 0 && !this.selectedOrder) {
        this.selectedOrder = orders[0];
      }
    });
  }

  selectOrder(order: Order) {
    this.selectedOrder = order;
  }

  getFilteredOrders(): Order[] {
    let list = this.activeTab === 'past' ? this.pastOrders : this.activeOrders;
    if (this.statusFilter !== 'all') {
      list = list.filter(o => o.status.toLowerCase() === this.statusFilter.toLowerCase());
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(o => o.id.toLowerCase().includes(q) || (o.displayId && o.displayId.toLowerCase().includes(q)));
    }
    return list;
  }

  get outForDeliveryCount(): number {
    return this.orders.filter(o => o.status === 'OutForDelivery').length;
  }

  getOutForDeliveryCount(): number {
    return this.outForDeliveryCount;
  }

  getTotalSpent(): number {
    return this.orders.reduce((sum, o) => sum + (o.total || 0), 0);
  }

  getFilteredActiveOrders(): Order[] {
    return this.getFilteredOrders();
  }

  getOrderItemNames(order: Order): string {
    if (!order.items || order.items.length === 0) return 'Homestyle Meal';
    return order.items.map((i: any) => i.mealName || i.MealName || i.name || 'Meal').join(', ');
  }

  get deliveredCount(): number {
    return this.orders.filter(o => o.status === 'Delivered').length;
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
