import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController } from '@ionic/angular';
import { Gemini, ChatMessage } from '../../services/gemini';
import { MealService } from '../../services/meal.service';
import { AuthService } from '../../services/auth';
import { OrderService, Order } from '../../services/order.service';
import { WalletService } from '../../services/wallet.service';
import { SubscriptionService, Subscription } from '../../services/subscription.service';

@Component({
  selector: 'app-ai-insights',
  templateUrl: './ai-insights.page.html',
  styleUrls: ['./ai-insights.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class AiInsightsPage implements OnInit {
  @ViewChild('content') content: any;

  messages: ChatMessage[] = [];
  userInput: string = '';
  isTyping: boolean = false;
  suggestions: string[] = [];

  /** Show only 2 suggestion cards to match the compact layout */
  get displayedSuggestions(): string[] {
    return this.suggestions.slice(0, 2);
  }

  // Context data
  private orderHistory: Order[] = [];
  private activeSubscription: Subscription | null = null;
  private walletBalance: number = 0;
  private creditUsed: number = 0;
  private creditLimit: number = 0;
  private preferences: {
    isVeg: boolean;
    favouriteCategory: string;
    avgSpend: number;
    mostOrderedMeal: string;
  } = { isVeg: true, favouriteCategory: 'Thali', avgSpend: 0, mostOrderedMeal: '' };

  constructor(
    private gemini: Gemini,
    private mealService: MealService,
    private auth: AuthService,
    private orderService: OrderService,
    private walletService: WalletService,
    private subscriptionService: SubscriptionService,
    private navCtrl: NavController
  ) { }

  ngOnInit() {
    this.loadContextData();
    this.generateSuggestions();
    this.setPersonalizedGreeting();
  }

  // ── Load all context data from services ────────────────────────────
  private loadContextData() {
    // Order history
    this.orderHistory = this.orderService.getOrders().slice(0, 5);

    // Wallet
    this.walletBalance = this.walletService.balance;
    this.creditUsed = this.walletService.creditUsed;
    this.creditLimit = this.walletService.creditLimit;

    // Subscription — get first active one for current user
    const userId = this.auth.userId || '';
    const subs = this.subscriptionService.getUserSubscriptions(userId);
    this.activeSubscription = subs.find(s => s.status === 'Active') || null;

    // Derive preferences from order history
    this.preferences = this.derivePreferences(this.orderHistory);
  }

  // ── Derive user preferences from past orders ──────────────────────
  private derivePreferences(orders: Order[]): {
    isVeg: boolean;
    favouriteCategory: string;
    avgSpend: number;
    mostOrderedMeal: string;
  } {
    if (!orders || orders.length === 0) {
      return { isVeg: true, favouriteCategory: 'Thali', avgSpend: 0, mostOrderedMeal: '' };
    }

    // Average spend
    const totalSpend = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const avgSpend = Math.round(totalSpend / orders.length);

    // Count meal names from order items to find most ordered
    const mealCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    let vegCount = 0;
    let totalItems = 0;

    for (const order of orders) {
      if (order.items && Array.isArray(order.items)) {
        for (const item of order.items) {
          const name = item.name || item.mealName || item.Name || '';
          const category = item.category || item.Category || 'General';
          const isVeg = item.isVeg !== undefined ? item.isVeg : (item.type === 'Veg');

          if (name) {
            mealCounts[name] = (mealCounts[name] || 0) + 1;
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
            if (isVeg) vegCount++;
            totalItems++;
          }
        }
      }
    }

    const mostOrderedMeal = Object.entries(mealCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || '';

    const favouriteCategory = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Thali';

    const isVeg = totalItems === 0 ? true : (vegCount / totalItems) >= 0.5;

    return { isVeg, favouriteCategory, avgSpend, mostOrderedMeal };
  }

  // ── Dynamic suggestions based on time + context ───────────────────
  private generateSuggestions() {
    const hour = new Date().getHours();
    const suggestions: string[] = [];

    // Time-based suggestions
    if (hour < 11) {
      suggestions.push("What should I have for breakfast?");
      suggestions.push("Show me light morning options");
    } else if (hour < 15) {
      suggestions.push("Aaj ka lunch kya hoga?");
      suggestions.push("Best thali under ₹120?");
    } else {
      suggestions.push("Suggest something for dinner");
      suggestions.push("What are tonight's options?");
    }

    // Subscription-aware
    if (this.activeSubscription) {
      const todaysMeal = this.subscriptionService.getTodaysMeal(this.activeSubscription);
      if (todaysMeal) {
        suggestions.push(`Today's meal is ${todaysMeal.name} — tell me about it`);
      }
    }

    // Wallet-aware
    if (this.walletBalance < 200) {
      suggestions.push("What can I order within ₹150?");
    }

    // Always include a nutrition one
    suggestions.push("Suggest a high-protein meal");

    this.suggestions = suggestions;
  }

  // ── Personalized greeting ─────────────────────────────────────────
  private setPersonalizedGreeting() {
    const hour = new Date().getHours();
    let greeting = 'Good evening';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 17) greeting = 'Good afternoon';

    const userName = this.auth.userName || 'there';

    let todayMealInfo = '';
    if (this.activeSubscription) {
      const todaysMeal = this.subscriptionService.getTodaysMeal(this.activeSubscription);
      if (todaysMeal) {
        todayMealInfo = `Aaj aapka subscription meal hai <b>${todaysMeal.name}</b>. `;
      }
    }

    this.messages = [{
      role: 'model',
      content: `${greeting} ${userName}! 🍽️ ${todayMealInfo}Main aapka AI Concierge hoon — meal recommend karna ho, order track karna ho, ya kuch custom banana ho — bas poochho!`
    }];
  }

  // ── Build the full context object ─────────────────────────────────
  private buildContext(meals: any[]) {
    const hour = new Date().getHours();
    let timeOfDay = 'evening';
    if (hour < 12) timeOfDay = 'morning';
    else if (hour < 17) timeOfDay = 'afternoon';

    // Subscription info
    let subscriptionInfo: any = { isActive: false, rotationMeals: [], todaysMeal: '', daysRemaining: 0 };
    if (this.activeSubscription) {
      const todaysMeal = this.subscriptionService.getTodaysMeal(this.activeSubscription);
      const endDate = new Date(this.activeSubscription.endDate);
      const today = new Date();
      const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

      subscriptionInfo = {
        isActive: true,
        rotationMeals: this.activeSubscription.rotationMeals.map(m => m.name),
        todaysMeal: todaysMeal?.name || '',
        daysRemaining
      };
    }

    return {
      userName: this.auth.userName || 'Guest',
      meals: meals.map((m: any) => ({
        id: m.id,
        name: m.name,
        category: m.category,
        price: m.price,
        isVeg: m.type === 'Veg',
        calories: m.calories || null,
        description: m.description || ''
      })),
      orderHistory: this.orderHistory.map(o => ({
        items: o.items?.map((i: any) => i.name || i.mealName || i.Name).filter(Boolean) || [],
        date: o.date,
        total: o.total
      })),
      subscription: subscriptionInfo,
      wallet: {
        balance: this.walletBalance,
        creditUsed: this.creditUsed,
        creditLimit: this.creditLimit
      },
      preferences: this.preferences,
      todayDate: new Date().toDateString(),
      timeOfDay
    };
  }

  // ── Send message ──────────────────────────────────────────────────
  async sendMessage(text?: string) {
    const messageText = text || this.userInput;
    if (!messageText.trim()) return;

    this.messages.push({ role: 'user', content: messageText });
    if (!text) this.userInput = '';

    this.scrollToBottom();
    this.isTyping = true;

    try {
      // Refresh context data each message for latest state
      this.loadContextData();

      const meals = this.mealService.getMeals();
      const context = this.buildContext(meals);

      const response = await this.gemini.getChatResponse(messageText, this.messages, context);
      this.messages.push({ role: 'model', content: response });
    } catch (error: any) {
      console.error('Chat Error:', error);
      let errorMsg = "Sorry, I encountered an error. Please try again.";
      
      if (error?.message?.includes('429') || error?.message?.includes('quota')) {
        errorMsg = "I'm a bit busy right now (limit exceeded). Please wait 5-10 seconds and try again! ⏳";
      }
      
      this.messages.push({ role: 'model', content: errorMsg });
    } finally {
      this.isTyping = false;
      this.scrollToBottom();
    }
  }

  scrollToBottom() {
    setTimeout(() => {
      if (this.content) {
        this.content.scrollToBottom(300);
      }
    }, 100);
  }

  goBack() {
    this.navCtrl.back();
  }

  formatTime(): string {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  }
}
