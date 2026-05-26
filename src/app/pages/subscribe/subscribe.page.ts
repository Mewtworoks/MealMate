import { Component, OnInit } from '@angular/core';
import { ToastController, AlertController, NavController, ActionSheetController } from '@ionic/angular';
import { MealService, Meal } from '../../services/meal.service';
import { Router } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { AuthService } from '../../services/auth';
import { WalletService } from '../../services/wallet.service';
import { SubscriptionService, Subscription } from '../../services/subscription.service';

export interface PlanOption {
  name: string;
  days: number;
  months: number;
  price: number;
  originalPrice: number;
  perDay: number;
  savePct: number | null;
}

@Component({
  selector: 'app-subscribe',
  templateUrl: './subscribe.page.html',
  styleUrls: ['./subscribe.page.scss'],
  standalone: false
})
export class SubscribePage implements OnInit {
  meals: Meal[] = [];
  selectedMeals: Meal[] = [];
  isPlacingOrder = false;

  // Active subscription
  activeSub: Subscription | null = null;

  // Plan selection
  selectedPlanIndex = 0;

  plans: PlanOption[] = [
    { name: '1 Month Plan', days: 30, months: 1, price: 3299, originalPrice: 3999, perDay: 110, savePct: null },
    { name: '3 Months Plan', days: 90, months: 3, price: 8999, originalPrice: 9999, perDay: 100, savePct: 10 },
    { name: '6 Months Plan', days: 180, months: 6, price: 15999, originalPrice: 19999, perDay: 89, savePct: 20 }
  ];

  // Default rotation meals (used when real meals aren't loaded yet)
  defaultRotation = [
    { name: 'Dal Makhani', image: 'assets/onboarding/dal_makhani.png', details: 'High Protein • 520 kcal' },
    { name: 'Paneer Tikka', image: 'assets/onboarding/paneer_tikka.png', details: 'High Protein • 480 kcal' },
    { name: 'Masala Dosa', image: 'assets/onboarding/veg_pulao.png', details: 'High Protein • 510 kcal' }
  ];

  whyItems = [
    { icon: 'refresh-outline', line1: 'Daily', line2: 'Rotation' },
    { icon: 'home-outline', line1: 'Home', line2: 'Cooked' },
    { icon: 'play-skip-forward-outline', line1: 'Skip', line2: 'Anytime' },
    { icon: 'wallet-outline', line1: 'Monthly', line2: 'Khata' }
  ];

  includedFeatures: string[] = [
    '3-meal daily rotation',
    'Auto wallet deduction ₹110/day',
    'Skip or pause anytime',
    'AI meal suggestions',
    'Free delivery to your location'
  ];

  // ─── Active Plan Data ───
  goalProgress = 0;
  daysLeft = 0;
  monthlyDeducted = 0;

  todaysMeal: any = { name: 'Dal Makhani Thali', details: 'High Protein • 520 kcal', image: 'assets/onboarding/dal_makhani.png' };

  rotationDisplay: any[] = [];
  weekDays: any[] = [];
  weekMealsCompleted = 0;
  upcomingDeliveries: any[] = [];

  constructor(
    private mealService: MealService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    public router: Router,
    private navCtrl: NavController,
    private orderService: OrderService,
    private auth: AuthService,
    private wallet: WalletService,
    private subscriptionService: SubscriptionService,
    private actionSheetCtrl: ActionSheetController
  ) {}

  ngOnInit() {
    this.mealService.meals$.subscribe(m => {
      this.meals = m;
    });
    this.mealService.refreshMeals();
    this.checkActiveSubscription();
    this.buildWeekDays();
  }

  goBack() {
    this.navCtrl.back();
  }

  // ═══════════════════════════════════════════════════
  // PLAN SELECTION (State 1)
  // ═══════════════════════════════════════════════════

  basePricePerMeal = 110;

  toggleMealSelection(meal: Meal) {
    const index = this.selectedMeals.findIndex(m => m.id === meal.id);
    if (index > -1) {
      this.selectedMeals.splice(index, 1);
    } else {
      if (this.selectedMeals.length < 3) {
        this.selectedMeals.push(meal);
      } else {
        this.showToast('You can select up to 3 meals for rotation');
      }
    }
  }

  isSelected(meal: Meal): boolean {
    return this.selectedMeals.some(m => m.id === meal.id);
  }

  selectPlan(index: number) {
    this.selectedPlanIndex = index;
  }

  async choosePlan(index: number) {
    this.selectedPlanIndex = index;
    const plan = this.plans[index];

    if (this.selectedMeals.length === 0) {
      this.showToast('Please select at least 1 meal for rotation');
      return;
    }

    const userId = this.auth.userId;
    if (!userId) {
      this.showToast('You must be logged in to subscribe.');
      this.router.navigate(['/login']);
      return;
    }

    const mealNames = this.selectedMeals.map(m => m.name).join(', ');
    const alert = await this.alertCtrl.create({
      header: 'Confirm Subscription',
      message: `
        <div style="text-align:center;">
          <strong>${plan.name}</strong><br>
          <span style="font-size:1.3rem;font-weight:900;color:#FF7235;">₹${plan.price.toLocaleString()}</span><br>
          <span style="font-size:0.8rem;color:#8E7C76;">₹${plan.perDay}/day · ${plan.days} days</span><br><br>
          <span style="font-size:0.75rem;">Rotation: ${mealNames}</span>
        </div>
      `,
      cssClass: 'premium-alert',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Subscribe Now', handler: () => this.processSubscription(plan) }
      ]
    });
    await alert.present();
  }

  async processSubscription(plan: PlanOption) {
    const userId = this.auth.userId;
    if (!userId) return;

    if (!this.wallet.canAfford(plan.price, false)) {
      const deficit = Math.max(0, plan.price - (this.wallet.balance + this.wallet.availableCredit));
      const alert = await this.alertCtrl.create({
        header: 'Insufficient Funds',
        message: `Your balance + credit is not enough. You need ₹${deficit.toFixed(0)} more.`,
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    this.isPlacingOrder = true;

    try {
      const rotationMeals = this.selectedMeals.map(m => ({
        mealId: m.id,
        name: m.name,
        price: m.price || plan.perDay
      }));

      const sub = await this.subscriptionService.createSubscription({
        customerId: userId,
        months: plan.months,
        rotationMeals: rotationMeals,
        startDate: new Date(),
        totalPaid: plan.price
      });

      this.wallet.deductBalance(plan.price);

      sub.planName = plan.name;
      sub.planTagline = `${plan.days} days • ₹${plan.perDay}/day`;
      this.activeSub = sub;

      // Rebuild active plan data
      this.computeActivePlanData();
      this.buildUpcomingDeliveries();

      await this.showToast('Subscription Activated! 🎉');
    } catch (error: any) {
      const errorMsg = error?.error || error?.message || 'Could not connect to the server.';
      const alert = await this.alertCtrl.create({
        header: 'Subscription Failed',
        message: typeof errorMsg === 'string' ? errorMsg : 'Something went wrong.',
        buttons: ['OK']
      });
      await alert.present();
    } finally {
      this.isPlacingOrder = false;
    }
  }

  // ═══════════════════════════════════════════════════
  // ACTIVE PLAN DASHBOARD (State 2)
  // ═══════════════════════════════════════════════════

  checkActiveSubscription() {
    const userId = this.auth.userId;
    if (!userId) return;

    const subs = this.subscriptionService.getUserSubscriptions(userId);
    const active = subs.find(s => s.status === 'Active');
    if (active) {
      this.activeSub = active;
      this.computeActivePlanData();
      this.buildUpcomingDeliveries();
    }
  }

  computeActivePlanData() {
    if (!this.activeSub) return;

    const start = new Date(this.activeSub.startDate);
    const end = new Date(this.activeSub.endDate);
    const now = new Date();

    const totalMs = end.getTime() - start.getTime();
    const elapsedMs = Math.max(0, now.getTime() - start.getTime());

    this.goalProgress = Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100)));

    const totalDays = Math.ceil(totalMs / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
    this.daysLeft = Math.max(0, totalDays - elapsedDays);

    // Monthly wallet deducted
    const daysSinceStart = Math.min(elapsedDays, 30);
    this.monthlyDeducted = Math.round(daysSinceStart * this.activeSub.dailyDeduction);

    // Today's meal from rotation
    const rotation = this.activeSub.rotationMeals;
    if (rotation.length > 0) {
      const todayIdx = elapsedDays % rotation.length;
      const todayMeal = rotation[todayIdx];
      this.todaysMeal = {
        name: todayMeal.name,
        details: `High Protein • ${400 + todayIdx * 40} kcal`,
        image: this.getMealImage(todayMeal.name)
      };

      // Build rotation display
      this.rotationDisplay = rotation.map((rm, i) => {
        const dayOffset = i - todayIdx;
        let whenLabel = '';
        if (dayOffset === 0) whenLabel = 'Today';
        else if (dayOffset === 1 || (dayOffset === -(rotation.length - 1))) whenLabel = 'Tomorrow';
        else whenLabel = 'Day after';

        return {
          name: rm.name,
          image: this.getMealImage(rm.name),
          dayLabel: `Day ${i + 1}`,
          isToday: i === todayIdx,
          whenLabel: whenLabel
        };
      });
    }
  }

  getMealImage(name: string): string {
    // Try to find from loaded meals
    const found = this.meals.find(m => m.name.toLowerCase().includes(name.toLowerCase().split(' ')[0]));
    if (found) return found.image;

    // Fallback mapping
    const lower = name.toLowerCase();
    if (lower.includes('dal')) return 'assets/onboarding/dal_makhani.png';
    if (lower.includes('paneer')) return 'assets/onboarding/paneer_tikka.png';
    if (lower.includes('dosa') || lower.includes('pulao') || lower.includes('veg')) return 'assets/onboarding/veg_pulao.png';
    if (lower.includes('salad')) return 'assets/onboarding/salad_bowl.png';
    if (lower.includes('palak')) return 'assets/onboarding/palak_paneer.png';
    return 'assets/onboarding/dal_makhani.png';
  }

  buildWeekDays() {
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const todayDay = today.getDay();
    const mappedToday = todayDay === 0 ? 6 : todayDay - 1;

    this.weekDays = dayNames.map((name, i) => ({
      short: name,
      completed: i < mappedToday,
      isToday: i === mappedToday,
      skipped: false
    }));

    this.weekMealsCompleted = this.weekDays.filter(d => d.completed).length;
  }

  buildUpcomingDeliveries() {
    if (!this.activeSub || this.activeSub.rotationMeals.length === 0) return;

    const rotation = this.activeSub.rotationMeals;
    const start = new Date(this.activeSub.startDate);
    const now = new Date();
    const elapsedDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    this.upcomingDeliveries = [];

    for (let d = 0; d < 3; d++) {
      const futureDay = elapsedDays + d;
      const mealIdx = futureDay % rotation.length;
      const meal = rotation[mealIdx];
      const deliveryDate = new Date(now);
      deliveryDate.setDate(deliveryDate.getDate() + d);

      let dayLabel = '';
      if (d === 0) dayLabel = 'Tomorrow';
      else if (d === 1) dayLabel = 'Day after';
      else dayLabel = `In ${d + 1} days`;

      // Actually first one is tomorrow
      const actualDate = new Date(now);
      actualDate.setDate(actualDate.getDate() + d + 1);

      this.upcomingDeliveries.push({
        name: meal.name,
        details: `High Protein • ${450 + mealIdx * 30} kcal`,
        image: this.getMealImage(meal.name),
        dateNum: actualDate.getDate(),
        dateMonth: actualDate.toLocaleString('default', { month: 'short' }),
        dayLabel: d === 0 ? 'Tomorrow' : d === 1 ? 'Day after' : `In ${d + 2} days`,
        time: '1:00 PM'
      });
    }
  }

  // ═══════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════

  async openPlanOptions() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Plan Options',
      buttons: [
        {
          text: this.activeSub?.status === 'Paused' ? 'Resume Plan' : 'Pause Plan',
          icon: this.activeSub?.status === 'Paused' ? 'play-outline' : 'pause-outline',
          handler: () => this.togglePause()
        },
        {
          text: 'Change Plan',
          icon: 'swap-horizontal-outline',
          handler: () => this.changePlan()
        },
        {
          text: 'Manage Rotation',
          icon: 'refresh-outline',
          handler: () => this.manageRotation()
        },
        {
          text: 'Cancel Subscription',
          icon: 'close-circle-outline',
          role: 'destructive',
          handler: () => this.cancelSubscription()
        },
        { text: 'Close', role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }

  togglePause() {
    if (!this.activeSub) return;
    if (this.activeSub.status === 'Active') {
      this.subscriptionService.pauseSubscription(this.activeSub.id);
      this.activeSub.status = 'Paused';
      this.showToast('Plan paused. We\'ll extend your end date ⏸️');
    } else if (this.activeSub.status === 'Paused') {
      this.subscriptionService.resumeSubscription(this.activeSub.id);
      this.activeSub.status = 'Active';
      this.showToast('Plan resumed! 🎉');
    }
  }

  async changePlan() {
    this.activeSub = null;
    this.showToast('Select a new plan below');
  }

  async manageRotation() {
    // Show rotation management options
    const alert = await this.alertCtrl.create({
      header: 'Manage Rotation',
      message: 'Rotation customization will be available in the next update. Currently your meals rotate automatically.',
      buttons: ['Got it']
    });
    await alert.present();
  }

  async cancelSubscription() {
    const alert = await this.alertCtrl.create({
      header: 'Cancel Subscription?',
      message: 'Are you sure? Your remaining balance will be refunded to your wallet.',
      buttons: [
        { text: 'Keep Plan', role: 'cancel' },
        {
          text: 'Cancel Plan',
          role: 'destructive',
          handler: () => {
            if (this.activeSub) {
              this.subscriptionService.pauseSubscription(this.activeSub.id);
              this.activeSub = null;
              this.showToast('Subscription cancelled. Refund processed to wallet.');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  viewAllMeals() {
    this.router.navigate(['/my-orders']);
  }

  contactSupport() {
    this.showToast('Our support team will reach you shortly! 💬');
  }

  async showToast(msg: string) {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 2500,
      position: 'bottom'
    });
    toast.present();
  }
}
