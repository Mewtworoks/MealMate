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
  isPlanControlsOpen = false;
  isCancelModalOpen = false;

  // Active subscription
  activeSub: Subscription | null = null;
  isLoading = true;

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
  nextDeductionLabel = 'Today';

  todaysMeal: any = { name: 'Dal Makhani Thali', details: 'High Protein • 520 kcal', image: 'assets/onboarding/dal_makhani.png', statusText: 'Arriving Today', statusClass: 'arriving' };

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

  async ngOnInit() {
    this.mealService.meals$.subscribe(m => {
      this.meals = m;
    });
  }

  async ionViewWillEnter() {
    this.mealService.refreshMeals();
    
    // Only show skeleton on first entry or when there is no plan loaded yet
    if (!this.activeSub) {
      this.isLoading = true;
    }
    
    try {
      await this.checkActiveSubscription();
      this.buildWeekDays();
    } catch (error) {
      console.error('Error fetching subscription in subscribe.page:', error);
    } finally {
      this.isLoading = false;
    }
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

  isConfirmModalOpen = false;
  confirmingPlan: PlanOption | null = null;

  choosePlan(index: number) {
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

    this.confirmingPlan = plan;
    this.isConfirmModalOpen = true;
  }

  confirmPurchase() {
    if (this.confirmingPlan) {
      this.isConfirmModalOpen = false;
      this.processSubscription(this.confirmingPlan);
    }
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
      this.buildWeekDays();

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

  async checkActiveSubscription() {
    const userId = this.auth.userId;
    if (!userId) return;

    await this.subscriptionService.fetchUserSubscriptions(userId);
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
    const todayLocal = new Date();

    const startDateLocal = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const todayDateLocal = new Date(todayLocal.getFullYear(), todayLocal.getMonth(), todayLocal.getDate());

    const msDiff = todayDateLocal.getTime() - startDateLocal.getTime();
    const daysDiff = Math.max(0, Math.floor(msDiff / (1000 * 60 * 60 * 24)));

    // Determine today's meal status
    const todayStr = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth() + 1).padStart(2, '0')}-${String(todayLocal.getDate()).padStart(2, '0')}`;
    const isTodaySkipped = this.activeSub?.skippedDays?.includes(todayStr) || false;
    const isTodayPaused = this.activeSub?.pausedDays?.includes(todayStr) || this.activeSub?.status === 'Paused';
    const isPastDeliveryTime = todayLocal.getHours() >= 13; // past 1:00 PM
    const isTodayCompleted = isPastDeliveryTime && !isTodaySkipped && !isTodayPaused;

    // Calculate completed days so far (excluding today)
    let completedDaysCount = 0;
    for (let d = 0; d < daysDiff; d++) {
      const currentCheckDate = new Date(startDateLocal);
      currentCheckDate.setDate(startDateLocal.getDate() + d);
      const dateStr = `${currentCheckDate.getFullYear()}-${String(currentCheckDate.getMonth() + 1).padStart(2, '0')}-${String(currentCheckDate.getDate()).padStart(2, '0')}`;
      const isSkipped = this.activeSub?.skippedDays?.includes(dateStr) || false;
      const isPaused = this.activeSub?.pausedDays?.includes(dateStr) || false;
      if (!isSkipped && !isPaused) {
        completedDaysCount++;
      }
    }

    // Add today if completed
    if (isTodayCompleted) {
      completedDaysCount++;
    }

    this.goalProgress = Math.min(100, Math.max(0, Math.round((completedDaysCount / this.activeSub.totalDays) * 100)));
    this.daysLeft = Math.max(0, this.activeSub.totalDays - completedDaysCount);

    // Monthly wallet deducted (based on completed days so far)
    this.monthlyDeducted = Math.round(completedDaysCount * this.activeSub.dailyDeduction);

    // Today's meal from rotation
    const rotation = this.activeSub.rotationMeals;
    if (rotation.length > 0) {
      // elapsedDays including today if past start date
      const totalElapsedMs = Math.max(0, todayLocal.getTime() - start.getTime());
      const elapsedDays = Math.floor(totalElapsedMs / (1000 * 60 * 60 * 24));
      
      const todayIdx = elapsedDays % rotation.length;
      const todayMeal = rotation[todayIdx];

      let todayStatusText = 'Arriving Today';
      let todayStatusClass = 'arriving';

      if (isTodaySkipped) {
        todayStatusText = 'Skipped';
        todayStatusClass = 'skipped';
      } else if (isTodayPaused) {
        todayStatusText = 'Paused';
        todayStatusClass = 'paused';
      } else if (isTodayCompleted) {
        todayStatusText = 'Delivered';
        todayStatusClass = 'delivered';
      }

      this.todaysMeal = {
        name: todayMeal.name,
        details: `High Protein • ${400 + todayIdx * 40} kcal`,
        image: this.getMealImage(todayMeal.name),
        statusText: todayStatusText,
        statusClass: todayStatusClass
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

    // Build next deduction label
    if (this.activeSub.status === 'Paused') {
      this.nextDeductionLabel = 'Paused';
    } else {
      let nextActiveDate = new Date(todayDateLocal);
      if (isTodayCompleted || isTodaySkipped || isTodayPaused) {
        nextActiveDate.setDate(nextActiveDate.getDate() + 1);
      }

      for (let i = 0; i < 30; i++) {
        const checkStr = `${nextActiveDate.getFullYear()}-${String(nextActiveDate.getMonth() + 1).padStart(2, '0')}-${String(nextActiveDate.getDate()).padStart(2, '0')}`;
        const isCheckSkipped = this.activeSub?.skippedDays?.includes(checkStr) || false;
        const isCheckPaused = this.activeSub?.pausedDays?.includes(checkStr) || false;
        if (!isCheckSkipped && !isCheckPaused) {
          break;
        }
        nextActiveDate.setDate(nextActiveDate.getDate() + 1);
      }

      const diffTime = nextActiveDate.getTime() - todayDateLocal.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        this.nextDeductionLabel = 'Today';
      } else if (diffDays === 1) {
        this.nextDeductionLabel = 'Tomorrow';
      } else {
        this.nextDeductionLabel = nextActiveDate.toLocaleDateString('default', { day: 'numeric', month: 'short' });
      }
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
    if (!this.activeSub) return;

    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const todayDay = today.getDay();
    const mappedToday = todayDay === 0 ? 6 : todayDay - 1;

    const todayDateLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const start = new Date(this.activeSub.startDate);
    const startDateLocal = new Date(start.getFullYear(), start.getMonth(), start.getDate());

    // Find the Monday of the current calendar week
    const mondayDate = new Date(todayDateLocal);
    mondayDate.setDate(todayDateLocal.getDate() - mappedToday);

    this.weekDays = dayNames.map((name, i) => {
      const dayDate = new Date(mondayDate);
      dayDate.setDate(mondayDate.getDate() + i);
      const dateStr = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;

      const isSkipped = this.activeSub?.skippedDays?.includes(dateStr) || false;
      const isPaused = this.activeSub?.pausedDays?.includes(dateStr) || this.activeSub?.status === 'Paused';
      const isToday = i === mappedToday;

      let completed = false;
      if (dayDate.getTime() < todayDateLocal.getTime()) {
        // In the past
        completed = dayDate.getTime() >= startDateLocal.getTime() && !isSkipped && !isPaused;
      } else if (isToday) {
        // Today — is completed if it's past 1:00 PM and not skipped/paused
        completed = today.getHours() >= 13 && !isSkipped && !isPaused;
      }

      return {
        short: name,
        completed: completed,
        isToday: isToday,
        skipped: isSkipped,
        paused: isPaused
      };
    });

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

  openPlanOptions() {
    this.isPlanControlsOpen = true;
  }

  async togglePause() {
    if (!this.activeSub) return;
    if (this.activeSub.status === 'Active') {
      await this.subscriptionService.pauseSubscription(this.activeSub.id);
      this.activeSub.status = 'Paused';
      this.showToast('Plan paused. We\'ll extend your end date ⏸️');
    } else if (this.activeSub.status === 'Paused') {
      await this.subscriptionService.resumeSubscription(this.activeSub.id);
      this.activeSub.status = 'Active';
      this.showToast('Plan resumed! 🎉');
    }
    this.computeActivePlanData();
    this.buildWeekDays();
  }

  async changePlan() {
    this.activeSub = null;
    this.showToast('Select a new plan below');
  }

  // ═══════════════════════════════════════════════════
  // ROTATION MANAGEMENT
  // ═══════════════════════════════════════════════════

  manageRotation() {
    this.router.navigate(['/manage-rotation']);
  }

  cancelSubscription() {
    this.isCancelModalOpen = true;
  }

  async confirmCancelSubscription() {
    if (this.activeSub) {
      this.isPlacingOrder = true;
      try {
        const res = await this.subscriptionService.cancelSubscription(this.activeSub.id);
        const refundAmt = res.RefundAmount || res.refundAmount || 0;
        
        const userId = this.auth.userId;
        if (userId) {
          await this.wallet.loadWallet(userId);
        }
        
        this.activeSub = null;
        this.isCancelModalOpen = false;
        this.showToast(`Subscription cancelled. Refund of ₹${refundAmt.toLocaleString()} processed to wallet.`);
      } catch (error) {
        console.error('Failed to cancel subscription:', error);
        this.showToast('Could not cancel subscription. Try again.');
      } finally {
        this.isPlacingOrder = false;
      }
    }
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
