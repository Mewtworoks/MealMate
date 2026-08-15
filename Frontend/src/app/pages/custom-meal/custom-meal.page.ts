import { Component, OnInit } from '@angular/core';
import { MealService, Agent } from '../../services/meal.service';
import { OrderService, Order } from '../../services/order.service';
import { Router } from '@angular/router';
import { NavController, ToastController } from '@ionic/angular';
import { Gemini } from '../../services/gemini';
import { AuthService } from '../../services/auth';
import { ThemeService } from '../../services/theme.service';
import { SubscriptionService, Subscription as MealSubscription } from '../../services/subscription.service';

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
    private gemini: Gemini,
    private auth: AuthService,
    public themeService: ThemeService,
    public subscriptionService: SubscriptionService
  ) { }

  get userName(): string {
    return this.auth.userName || 'MealMate_User';
  }

  get userInitials(): string {
    return this.auth.userInitials || 'MU';
  }

  get activeSubscription(): MealSubscription | null {
    const userId = this.auth.userId;
    if (!userId) return null;
    const subs = this.subscriptionService.getUserSubscriptions(userId);
    return subs.find(s => s.status === 'Active') || subs[0] || null;
  }

  get planName(): string {
    return (this.activeSubscription && this.activeSubscription.planName) ? this.activeSubscription.planName : 'Healthy Mix Plan';
  }

  get activePlanPercent(): number {
    if (!this.activeSubscription) return 6;
    return Math.round((this.activeSubscription.currentDay / this.activeSubscription.totalDays) * 100);
  }

  get selectedChef(): Agent | null {
    return this.agents.find(a => a.id === this.selectedAgentId) || (this.agents.length > 0 ? this.agents[0] : null);
  }

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

  isLoadingChefs: boolean = false;
  userLat: number = 28.6139;
  userLng: number = 77.2090;
  radiusKm: number = 20;

  async ngOnInit() {
    await this.loadNearbyChefs();
  }

  async loadNearbyChefs() {
    this.isLoadingChefs = true;
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          this.userLat = position.coords.latitude;
          this.userLng = position.coords.longitude;
          await this.fetchChefs();
        },
        async (error) => {
          console.log('GPS position unavailable, using city reference coords');
          await this.fetchChefs();
        },
        { timeout: 5000 }
      );
    } else {
      await this.fetchChefs();
    }
  }

  async fetchChefs() {
    try {
      this.agents = await this.mealService.getNearbyChefs(this.userLat, this.userLng, this.radiusKm);
      if (this.agents.length > 0) {
        this.selectedAgentId = this.agents[0].id;
      } else {
        this.selectedAgentId = '';
      }
    } catch (e) {
      console.error('Failed to load nearby chefs:', e);
      this.agents = [];
      this.selectedAgentId = '';
    } finally {
      this.isLoadingChefs = false;
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

    const userId = this.auth.userId;
    if (!userId) {
      const toast = await this.toastCtrl.create({
        message: 'You must be logged in to request a custom meal',
        duration: 2000,
        color: 'warning'
      });
      toast.present();
      this.router.navigate(['/login']);
      return;
    }

    const orderPayload = {
      customerId: userId,
      agentId: this.selectedAgentId,
      deliveryAddress: 'Home',
      paymentMethod: 'COD',
      redeemPoints: false,
      isCustomMeal: true,
      customMealDetails: `${this.mealName} - ${this.details} | Type: ${this.mealType}`,
      estimatedTotal: this.estimateMax,
      items: []
    };

    try {
      await this.orderService.placeOrder(orderPayload);
      
      const toast = await this.toastCtrl.create({
        message: 'Custom meal request sent to agent!',
        duration: 3000,
        color: 'success'
      });
      toast.present();

      this.router.navigate(['/my-orders']);
    } catch (e) {
      const toast = await this.toastCtrl.create({
        message: 'Failed to send custom meal request.',
        duration: 2000,
        color: 'danger'
      });
      toast.present();
    }
  }

  goBack() {
    this.navCtrl.back();
  }
}