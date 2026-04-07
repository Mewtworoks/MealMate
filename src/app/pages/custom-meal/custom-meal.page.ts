import { Component, OnInit } from '@angular/core';
import { MealService, Agent } from '../../services/meal.service';
import { OrderService, Order } from '../../services/order.service';
import { Router } from '@angular/router';
import { NavController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-custom-meal',
  templateUrl: './custom-meal.page.html',
  styleUrls: ['./custom-meal.page.scss'],
  standalone: false
})
export class CustomMealPage implements OnInit {
  agents: Agent[] = [];
  selectedAgentId: string = '';
  mealName: string = '';
  details: string = '';
  mealType: 'Veg' | 'Non-Veg' = 'Veg';
  deliveryTime: string = '13:00';

  constructor(
    private mealService: MealService,
    private orderService: OrderService,
    private router: Router,
    private navCtrl: NavController,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {
    this.agents = this.mealService.getAgents();
    if (this.agents.length > 0) {
      this.selectedAgentId = this.agents[0].id;
    }
  }

  async submitOrder() {
    if (!this.mealName || !this.selectedAgentId) {
       const toast = await this.toastCtrl.create({
         message: 'Please fill in the meal name and select an agent',
         duration: 2000,
         color: 'warning'
       });
       toast.present();
       return;
    }

    const newOrder: Order = {
      id: 'CUST-' + Math.floor(Math.random() * 8999 + 1000),
      date: new Date().toISOString(),
      total: 150, // Dummy estimate for custom meal
      items: [],
      status: 'Pending',
      creditUsed: 0,
      amountDue: 150,
      isCustomMeal: true,
      agentId: this.selectedAgentId,
      deliveryTime: this.deliveryTime
    };

    this.orderService.addOrder(newOrder);
    
    const toast = await this.toastCtrl.create({
      message: 'Custom meal request sent to agent!',
      duration: 3000,
      color: 'success'
    });
    toast.present();

    this.router.navigate(['/my-orders']);
  }

  goBack() {
    this.navCtrl.back();
  }
}
