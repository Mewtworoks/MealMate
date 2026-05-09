import { Component, OnInit } from '@angular/core';
import { MealService, Agent } from '../../services/meal.service';
import { OrderService, Order } from '../../services/order.service';
import { Router } from '@angular/router';
import { NavController, ToastController } from '@ionic/angular';
import { Gemini } from '../../services/gemini';

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
  estimateMin: number = 150;
  estimateMax: number = 250;
  isEstimating: boolean = false;
  private debounceTimer: any;

  constructor(
    private mealService: MealService,
    private orderService: OrderService,
    private router: Router,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private gemini: Gemini
  ) { }

  consultAi() {
    this.router.navigate(['/ai-concierge']);
  }

  async getPriceEstimate() {
    if (!this.mealName || this.mealName.length < 3) return;
    
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    
    this.debounceTimer = setTimeout(async () => {
      this.isEstimating = true;
      try {
        const location = localStorage.getItem('userLocation') || 'Mumbai, India';
        const prompt = `Act as a local food expert in ${location}. 
        User wants a custom home-cooked dish: "${this.mealName}". 
        Special details: "${this.details}".
        Estimate the typical local price range for this home-cooked meal.
        Return ONLY a JSON object: {"min": number, "max": number}. 
        CRITICAL: Numbers MUST be greater than 100. Never return 0.
        Range should be realistic tiffin prices (₹100-₹700).`;
        
        const response = await this.gemini.getChatResponse(prompt, [], { userName: 'User', wallet: { balance: 0 }, meals: [] });
        const jsonStr = response.match(/\{.*\}/s)?.[0];
        if (jsonStr) {
          const data = JSON.parse(jsonStr);
          this.estimateMin = data.min && data.min > 0 ? data.min : 150;
          this.estimateMax = data.max && data.max > 0 ? data.max : 250;
        } else {
          // Default fallbacks if AI fails to return JSON
          this.estimateMin = 150;
          this.estimateMax = 250;
        }
      } catch (e) {
        console.error('Estimation error');
        this.estimateMin = 150;
        this.estimateMax = 250;
      } finally {
        this.isEstimating = false;
      }
    }, 400); 
  }

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