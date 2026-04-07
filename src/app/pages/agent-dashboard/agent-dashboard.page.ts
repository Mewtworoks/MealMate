import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { OrderService, Order } from '../../services/order.service';
import { MealService, Meal } from '../../services/meal.service';
import { Router } from '@angular/router';

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
  agentMeals: Meal[] = [];
  activeSegment = 'requests';
  earnings = 0;

  constructor(
    private orderService: OrderService,
    private mealService: MealService,
    private router: Router
  ) { }

  ngOnInit() {
    this.orderService.orders$.subscribe(allOrders => {
      this.orders = allOrders;
      this.filterOrders();
      this.calculateEarnings();
    });

    // We assume the logged-in agent is the first agent from MealService, ID 'A1'
    this.agentMeals = this.mealService.getMeals().filter(m => m.agentId === 'A1');
  }

  filterOrders() {
    this.pendingOrders = this.orders.filter(o => o.status === 'Pending');
    this.activeOrders = this.orders.filter(o => ['Accepted', 'Preparing', 'OutForDelivery'].includes(o.status));
    this.completedOrders = this.orders.filter(o => o.status === 'Delivered');
  }

  calculateEarnings() {
    this.earnings = this.completedOrders.reduce((sum, o) => sum + o.total, 0);
  }

  updateOrderStatus(orderId: string, newStatus: any) {
    const order = this.orders.find(o => o.id === orderId);
    if (order) {
      order.status = newStatus;
      // In a real app, we'd call a service method to update DB
      this.filterOrders();
    }
  }

  acceptOrder(orderId: string) {
    this.updateOrderStatus(orderId, 'Accepted');
  }

  rejectOrder(orderId: string) {
    this.updateOrderStatus(orderId, 'Rejected');
  }

  toggleMealAvailability(meal: Meal) {
    if (meal.isAvailable === undefined) {
      meal.isAvailable = false; // Toggle to false if it was initially implicitly true
    } else {
      meal.isAvailable = !meal.isAvailable;
    }
  }

  getStatusColor(status: string): string {
    switch(status) {
      case 'Pending': return 'warning';
      case 'Accepted': return 'success';
      case 'Preparing': return 'primary';
      case 'OutForDelivery': return 'secondary';
      case 'Delivered': return 'medium';
      default: return 'dark';
    }
  }
}
