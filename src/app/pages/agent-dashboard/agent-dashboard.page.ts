import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, AlertController } from '@ionic/angular';
import { OrderService, Order } from '../../services/order.service';
import { MealService, Meal } from '../../services/meal.service';
import { TrackingService } from '../../services/tracking.service';
import { GpsService } from '../../services/gps.service';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { Subscription } from 'rxjs';
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';

@Component({
  selector: 'app-agent-dashboard',
  templateUrl: './agent-dashboard.page.html',
  styleUrls: ['./agent-dashboard.page.scss'],
  standalone: false
})
export class AgentDashboardPage implements OnInit {
  orders: Order[] = [];
  pendingOrders: Order[] = [];
  activeOrders: Order[] = [];
  completedOrders: Order[] = [];
  activeSegment = 'requests';
  earnings = 0;
  isProfileModalOpen = false;
  isOnline = true;
  chefName = '';
  greeting = '';
  private ordersSubscription?: Subscription;

  get currentDelivery(): Order | null {
    return this.activeOrders.find(o => o.status === 'OutForDelivery') || this.activeOrders[0] || null;
  }

  toggleOnlineStatus() {
    this.isOnline = !this.isOnline;
  }

  constructor(
    private orderService: OrderService,
    private mealService: MealService,
    private trackingService: TrackingService,
    private gpsService: GpsService,
    private auth: AuthService,
    private router: Router,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController
  ) { }

  async ionViewWillEnter() {
    this.chefName = this.auth.userName || 'Chef';
    this.greeting = this.auth.greeting;
    const agentId = this.auth.userId;
    if (agentId) {
      await this.orderService.refreshAgentOrders(agentId);
    }

    if (this.ordersSubscription) {
      this.ordersSubscription.unsubscribe();
    }
    
    this.ordersSubscription = this.orderService.orders$.subscribe(allOrders => {
      this.orders = allOrders;
      this.filterOrders();
      this.calculateEarnings();
    });
  }

  ngOnInit() {}

  logout() {
    this.isProfileModalOpen = false;
    this.auth.logout();
    this.trackingService.stopAgentTracking();
    const lastLoc = this.gpsService.lastLocation || { latitude: 0, longitude: 0 };
    this.gpsService.stopTracking(lastLoc.latitude, lastLoc.longitude);
    this.router.navigate(['/login']);
  }

  filterOrders() {
    this.pendingOrders = this.orders.filter(o => o.status === 'Pending');
    this.activeOrders = this.orders.filter(o => ['Accepted', 'Preparing', 'OutForDelivery'].includes(o.status));
    this.completedOrders = this.orders.filter(o => o.status === 'Delivered');
  }

  calculateEarnings() {
    this.earnings = this.completedOrders.reduce((sum, o) => sum + o.total, 0);
  }

  async updateOrderStatus(orderId: string, newStatus: any) {
    const agentId = this.auth.userId;
    await this.orderService.updateOrderStatus(orderId, newStatus);

    // Trigger tracking if needed
    if (newStatus === 'OutForDelivery') {
      this.trackingService.startAgentTracking(); // keep old one for UI compat if needed
      this.gpsService.activeOrderId = orderId;
      this.gpsService.startTracking(agentId || '');
    } else if (newStatus === 'Delivered') {
      this.trackingService.stopAgentTracking();
      const lastLoc = this.gpsService.lastLocation || { latitude: 0, longitude: 0 };
      this.gpsService.stopTracking(lastLoc.latitude, lastLoc.longitude);
      firebase.database().ref(`tracking/${orderId}`).remove();
    }

    if (agentId) {
      await this.orderService.refreshAgentOrders(agentId);
    }
  }

  acceptOrder(orderId: string) {
    this.updateOrderStatus(orderId, 'Accepted');
  }

  rejectOrder(orderId: string) {
    this.updateOrderStatus(orderId, 'Rejected');
  }

  getStatusColor(status: string): string {
    return this.orderService.getStatusColor(status);
  }

  // Analytics Helpers
  get todaysEarnings(): number {
    return 0;
  }
}
