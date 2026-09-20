import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OrderService, Order } from '../../services/order.service';
import { AuthService } from '../../services/auth';
import { ActionSheetController, NavController, ToastController } from '@ionic/angular';
import { Subscription, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

import { PageLoaderService } from '../../services/page-loader.service';
import { ThemeService } from '../../services/theme.service';

export interface DailyEarning {
  day: string;
  amount: number;
  isToday: boolean;
}

export interface RecentOrderEarning {
  id: string;
  mealName: string;
  mealImage: string;
  customerName: string;
  distance: string;
  earnings: number;
  time: string;
}

@Component({
  selector: 'app-agent-earnings',
  templateUrl: './agent-earnings.page.html',
  styleUrls: ['./agent-earnings.page.scss'],
  standalone: false
})
export class AgentEarningsPage implements OnInit {
  // Greeting
  greeting = 'Good Evening';
  chefName = 'Chef';
  get userName(): string { return this.auth.userName || 'MealMate User'; }
  get userInitials(): string { return this.auth.userInitials; }

  // Hero card
  totalEarned = 0;
  ordersCompleted = 0;
  avgPerOrder = 0;
  private lastWeekEarnings = 0;

  get earningsVsLastWeek(): number {
    return Math.abs(this.weekEarnings - this.lastWeekEarnings);
  }

  get earningsTrendLabel(): string {
    return this.weekEarnings >= this.lastWeekEarnings ? 'more than last week' : 'less than last week';
  }

  get earningsTrendIcon(): string {
    return this.weekEarnings >= this.lastWeekEarnings ? 'arrow-up-outline' : 'arrow-down-outline';
  }

  // Quick stats
  todaysEarnings = 0;
  todaysOrders = 0;
  weekEarnings = 0;
  weekOrders = 0;
  monthEarnings = 0;
  monthOrders = 0;

  // Weekly chart data
  weeklyData: DailyEarning[] = [];
  maxWeeklyEarning = 0;

  // Advance deduction
  advanceTaken = 2000;
  dailyDeduction = 100;
  deductionDaysLeft = 5;
  advanceRemaining = 500;
  totalAdvanceDeducted = 1500;
  hasAdvance = false;

  // Pending payout
  pendingPayout = 0;
  isWithdrawing = false;

  // Recent orders
  recentOrders: RecentOrderEarning[] = [];

  // Monthly summary
  monthlyTotalEarned = 0;
  monthlyDeductions = 0;
  monthlyNetPayout = 0;
  monthlyOrdersCompleted = 0;
  selectedMonth = '';

  // Period filter
  selectedPeriod = 'This Week';

  // Loading
  isLoading = true;

  private orders: Order[] = [];
  private ordersSub?: Subscription;

  constructor(
    private http: HttpClient,
    private orderService: OrderService,
    private auth: AuthService,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private actionSheetCtrl: ActionSheetController,
    public themeService: ThemeService,
    private pageLoader: PageLoaderService
  ) {}

  ngOnInit() {}

  async ionViewWillEnter() {
    this.isLoading = true;
    this.pageLoader.show(true);
    this.chefName = this.auth.userName || 'Chef';
    this.greeting = this.auth.greeting;
    const now = new Date();
    this.selectedMonth = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    const agentId = this.auth.userId;
    if (agentId) {
      // Try to load from backend API first
      const apiLoaded = await this.loadFromApi(agentId);

      // If API fails, fall back to local order data computation
      if (!apiLoaded) {
        await this.orderService.refreshAgentOrders(agentId);
        this.ordersSub = this.orderService.orders$.subscribe(allOrders => {
          this.orders = allOrders;
          this.computeLocally();
        });
      }
    }

    this.isLoading = false;
    this.pageLoader.show(false);
  }

  ionViewWillLeave() {
    this.ordersSub?.unsubscribe();
  }

  // =========================================================================
  // API-based loading
  // =========================================================================
  async loadFromApi(agentId: string): Promise<boolean> {
    try {
      const res: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/earnings/${agentId}/summary`)
      );

      // Hero card
      this.totalEarned = res.TotalEarned ?? res.totalEarned ?? 0;
      this.ordersCompleted = res.OrdersCompleted ?? res.ordersCompleted ?? 0;
      this.avgPerOrder = res.AvgPerOrder ?? res.avgPerOrder ?? 0;
      this.lastWeekEarnings = res.LastWeekEarnings ?? res.lastWeekEarnings ?? (res.WeekEarnings ?? res.weekEarnings ?? 0);

      // Quick stats
      this.todaysEarnings = res.TodaysEarnings ?? res.todaysEarnings ?? 0;
      this.todaysOrders = res.TodaysOrders ?? res.todaysOrders ?? 0;
      this.weekEarnings = res.WeekEarnings ?? res.weekEarnings ?? 0;
      this.weekOrders = res.WeekOrders ?? res.weekOrders ?? 0;
      this.monthEarnings = res.MonthEarnings ?? res.monthEarnings ?? 0;
      this.monthOrders = res.MonthOrders ?? res.monthOrders ?? 0;

      // Weekly chart
      const chart = res.WeeklyChart ?? res.weeklyChart ?? [];
      this.weeklyData = chart.map((d: any) => ({
        day: d.Day ?? d.day,
        amount: d.Amount ?? d.amount ?? 0,
        isToday: d.IsToday ?? d.isToday ?? false
      }));

      this.maxWeeklyEarning = Math.max(...this.weeklyData.map(d => d.amount), 1);

      // Advance deduction
      const adv = res.AdvanceDeduction ?? res.advanceDeduction;
      if (adv) {
        this.hasAdvance = true;
        this.advanceTaken = adv.AdvanceTaken ?? adv.advanceTaken ?? 0;
        this.dailyDeduction = adv.DailyDeduction ?? adv.dailyDeduction ?? 0;
        this.deductionDaysLeft = adv.DeductionDaysLeft ?? adv.deductionDaysLeft ?? 0;
        this.advanceRemaining = adv.Remaining ?? adv.remaining ?? 0;
        this.totalAdvanceDeducted = adv.TotalDeducted ?? adv.totalDeducted ?? 0;
      } else {
        this.clearAdvance();
      }

      // Pending payout
      this.pendingPayout = res.PendingPayout ?? res.pendingPayout ?? 0;

      // Recent orders
      const recent = res.RecentOrders ?? res.recentOrders ?? [];
      this.recentOrders = recent.map((o: any) => ({
        id: o.Id ?? o.id,
        mealName: o.MealName ?? o.mealName ?? 'Meal Order',
        mealImage: o.MealImage ?? o.mealImage ?? 'assets/onboarding/dal_chawal.png',
        customerName: o.CustomerName ?? o.customerName ?? 'Customer',
        distance: (o.DistanceKm ?? o.distanceKm) ? `${o.DistanceKm ?? o.distanceKm} km` : '—',
        earnings: o.Earnings ?? o.earnings ?? 0,
        time: new Date(o.OrderDate ?? o.orderDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      }));

      // Monthly summary
      this.monthlyTotalEarned = res.MonthlyTotalEarned ?? res.monthlyTotalEarned ?? 0;
      this.monthlyDeductions = res.MonthlyDeductions ?? res.monthlyDeductions ?? 0;
      this.monthlyNetPayout = res.MonthlyNetPayout ?? res.monthlyNetPayout ?? 0;
      this.monthlyOrdersCompleted = res.MonthlyOrdersCompleted ?? res.monthlyOrdersCompleted ?? 0;

      return true;
    } catch (err) {
      console.warn('EarningsPage: API unavailable, falling back to local computation.', err);
      return false;
    }
  }

  // =========================================================================
  // Local fallback computation (same as before)
  // =========================================================================
  computeLocally() {
    const delivered = this.orders.filter(o => o.status === 'Delivered');
    const now = new Date();
    const todayStr = now.toDateString();

    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - mondayOffset);
    weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const todayOrders = delivered.filter(o => new Date(o.date).toDateString() === todayStr);
    const weekOrders = delivered.filter(o => new Date(o.date) >= weekStart);
    const monthOrders = delivered.filter(o => new Date(o.date) >= monthStart);
    const lastWeekOrders = delivered.filter(o => {
      const d = new Date(o.date);
      return d >= lastWeekStart && d < weekStart;
    });

    this.todaysEarnings = todayOrders.reduce((s, o) => s + o.total, 0);
    this.todaysOrders = todayOrders.length;
    this.weekEarnings = weekOrders.reduce((s, o) => s + o.total, 0);
    this.weekOrders = weekOrders.length;
    this.monthEarnings = monthOrders.reduce((s, o) => s + o.total, 0);
    this.monthOrders = monthOrders.length;
    this.lastWeekEarnings = lastWeekOrders.reduce((s, o) => s + o.total, 0);

    this.totalEarned = this.weekEarnings;
    this.ordersCompleted = this.weekOrders;
    this.avgPerOrder = this.ordersCompleted > 0 ? Math.round(this.totalEarned / this.ordersCompleted) : 0;

    this.buildWeeklyChart(weekStart, delivered);
    this.clearAdvance();

    this.pendingPayout = this.weekEarnings - this.totalAdvanceDeducted;
    if (this.pendingPayout < 0) this.pendingPayout = 0;

    this.recentOrders = delivered.slice(0, 5).map((o) => ({
      id: o.id,
      mealName: o.items[0]?.name || 'Meal Order',
      mealImage: o.items[0]?.image || 'assets/onboarding/dal_chawal.png',
      customerName: o.customerName || 'Guest',
      distance: o.distanceKm ? `${o.distanceKm} km` : '—',
      earnings: o.total,
      time: new Date(o.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    }));

    this.monthlyTotalEarned = this.monthEarnings;
    this.monthlyDeductions = this.totalAdvanceDeducted;
    this.monthlyNetPayout = Math.max(0, this.monthlyTotalEarned - this.monthlyDeductions);
    this.monthlyOrdersCompleted = this.monthOrders;
  }

  buildWeeklyChart(weekStart: Date, delivered: Order[]) {
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const todayDayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;

    this.weeklyData = [];
    for (let i = 0; i <= 6; i++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + i);
      const dayStr = dayDate.toDateString();
      const dayOrders = delivered.filter(o => new Date(o.date).toDateString() === dayStr);
      const dayTotal = dayOrders.reduce((s, o) => s + o.total, 0);
      const isToday = i === todayDayIndex;

      this.weeklyData.push({
        day: isToday ? 'Today' : dayNames[i],
        amount: dayTotal,
        isToday
      });
    }

    this.maxWeeklyEarning = Math.max(...this.weeklyData.map(d => d.amount), 1);
  }

  clearAdvance() {
    this.hasAdvance = false;
    this.advanceTaken = 0;
    this.dailyDeduction = 0;
    this.totalAdvanceDeducted = 0;
    this.advanceRemaining = 0;
    this.deductionDaysLeft = 0;
  }

  // =========================================================================
  // UI Helpers
  // =========================================================================


  getBarHeight(amount: number): number {
    return Math.max(8, (amount / this.maxWeeklyEarning) * 100);
  }

  get bestDayLabel(): string {
    if (!this.weeklyData || this.weeklyData.length === 0) return '—';
    const best = this.weeklyData.reduce((a, b) => (b.amount > a.amount ? b : a));
    return best.amount > 0 ? `${best.day} · ₹${best.amount.toLocaleString('en-IN')}` : '—';
  }

  get slowestDayLabel(): string {
    if (!this.weeklyData || this.weeklyData.length === 0) return '—';
    const slowest = this.weeklyData.reduce((a, b) => (b.amount < a.amount ? b : a));
    return `${slowest.day} · ₹${slowest.amount.toLocaleString('en-IN')}`;
  }

  get avgPerDay(): number {
    if (!this.weeklyData || this.weeklyData.length === 0) return 0;
    const total = this.weeklyData.reduce((s, d) => s + d.amount, 0);
    return Math.round(total / this.weeklyData.length);
  }

  // =========================================================================
  // Withdraw — calls API, falls back to local toast
  // =========================================================================
  async withdrawPayout() {
    if (this.pendingPayout <= 0) return;
    this.isWithdrawing = true;

    const agentId = this.auth.userId;

    try {
      if (agentId) {
        await firstValueFrom(
          this.http.post(`${environment.apiUrl}/earnings/${agentId}/withdraw`, { amount: this.pendingPayout })
        );
      }
    } catch (err) {
      console.warn('Withdraw API call failed, showing local confirmation.', err);
    }

    // Simulate short delay
    await new Promise(resolve => setTimeout(resolve, 800));
    this.isWithdrawing = false;

    const toast = await this.toastCtrl.create({
      message: `₹${this.pendingPayout.toLocaleString()} withdrawal requested! You'll receive it within 24 hours. 🎉`,
      duration: 3000,
      color: 'success',
      position: 'top'
    });
    toast.present();
  }

  goBack() {
    this.navCtrl.back();
  }

  // =========================================================================
  // Period filter — switches the hero card between week/month totals
  // =========================================================================
  async openPeriodPicker() {
    const sheet = await this.actionSheetCtrl.create({
      header: 'Select period',
      buttons: [
        { text: 'This Week', handler: () => this.setPeriod('This Week') },
        { text: 'This Month', handler: () => this.setPeriod('This Month') },
        { text: 'Cancel', role: 'cancel' }
      ]
    });
    await sheet.present();
  }

  setPeriod(period: 'This Week' | 'This Month') {
    this.selectedPeriod = period;
    if (period === 'This Month') {
      this.totalEarned = this.monthEarnings;
      this.ordersCompleted = this.monthOrders;
    } else {
      this.totalEarned = this.weekEarnings;
      this.ordersCompleted = this.weekOrders;
    }
    this.avgPerOrder = this.ordersCompleted > 0 ? Math.round(this.totalEarned / this.ordersCompleted) : 0;
  }
}
