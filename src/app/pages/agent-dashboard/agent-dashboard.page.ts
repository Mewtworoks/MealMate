import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, AlertController } from '@ionic/angular';
import { OrderService, Order } from '../../services/order.service';
import { MealService, Meal } from '../../services/meal.service';
import { TrackingService } from '../../services/tracking.service';
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
  isMenuModalOpen = false;
  isAddMealModalOpen = false;
  isProfileModalOpen = false;

  mealForm = {
    name: '',
    description: '',
    price: 0,
    category: 'Lunch' as any,
    image: 'assets/onboarding/dal_makhani.png',
    type: 'Veg' as any
  };

  availableImages = [
    'assets/onboarding/dal_makhani.png',
    'assets/onboarding/paneer_tikka.png',
    'assets/onboarding/veg_pulao.png'
  ];

  constructor(
    private orderService: OrderService,
    private mealService: MealService,
    private trackingService: TrackingService,
    private router: Router,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController
  ) { }

  ngOnInit() {
    this.orderService.orders$.subscribe(allOrders => {
      this.orders = allOrders;
      this.filterOrders();
      this.calculateEarnings();
    });

    this.mealService.meals$.subscribe(allMeals => {
      this.agentMeals = allMeals.filter(m => m.agentId === 'a1'); 
    });
  }

  saveNewMeal() {
    if (this.mealForm.name && this.mealForm.price) {
      const newMeal: Meal = {
        id: 'm' + Date.now(),
        ...this.mealForm,
        agentId: 'a1',
        spiceLevel: 'Medium',
        calories: 350,
        isAvailable: true
      };
      this.mealService.addMeal(newMeal);
      this.isAddMealModalOpen = false;
      this.resetMealForm();
    }
  }

  resetMealForm() {
    this.mealForm = {
      name: '',
      description: '',
      price: 0,
      category: 'Lunch',
      image: 'assets/onboarding/dal_makhani.png',
      type: 'Veg'
    };
  }

  logout() {
    this.isProfileModalOpen = false;
    this.trackingService.stopAgentTracking();
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

  updateOrderStatus(orderId: string, newStatus: any) {
    const order = this.orders.find(o => o.id === orderId);
    if (order) {
      order.status = newStatus;
      
      // Real-time GPS Tracking Trigger
      if (newStatus === 'OutForDelivery') {
        this.trackingService.startAgentTracking();
      } else if (newStatus === 'Delivered') {
        this.trackingService.stopAgentTracking();
      }

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
