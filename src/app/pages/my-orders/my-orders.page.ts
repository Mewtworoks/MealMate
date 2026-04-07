import { Component, OnInit } from '@angular/core';
import { OrderService, Order } from '../../services/order.service';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-my-orders',
  templateUrl: './my-orders.page.html',
  styleUrls: ['./my-orders.page.scss'],
  standalone: false
})
export class MyOrdersPage implements OnInit {
  orders: Order[] = [];
  activeTab: 'active' | 'past' | 'subscriptions' = 'active';

  constructor(
    private orderService: OrderService,
    private router: Router,
    private navCtrl: NavController
  ) { }

  ngOnInit() {
    this.orderService.orders$.subscribe(orders => {
      this.orders = orders;
      // If we just subscribed, auto-switch to subscriptions tab
      if (this.subscriptionOrders.length > 0 && this.activeOrders.length === 0) {
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

  get subscriptionOrders(): Order[] {
    return this.orders.filter(o => o.subscriptionId);
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'Pending': return 'time-outline';
      case 'Accepted': return 'checkmark-circle-outline';
      case 'Preparing': return 'flame-outline';
      case 'OutForDelivery': return 'bicycle-outline';
      case 'Delivered': return 'checkmark-done-circle-outline';
      case 'Rejected': return 'close-circle-outline';
      default: return 'ellipse-outline';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'OutForDelivery': return 'On the way';
      case 'Pending': return 'Waiting';
      default: return status;
    }
  }

  onOrderClick(order: Order) {
    if (order.status === 'OutForDelivery') {
      this.router.navigate(['/live-tracking'], { queryParams: { orderId: order.id } });
    }
  }

  goToShop() {
    this.router.navigate(['/customer-home']);
  }

  goBack() {
    this.navCtrl.back();
  }
}
