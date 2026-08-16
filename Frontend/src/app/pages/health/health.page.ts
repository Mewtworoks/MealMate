import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AuthService } from '../../services/auth';
import { HealthService, HealthGoal, DailyLog, WeeklyDay } from '../../services/health.service';
import { MealService } from '../../services/meal.service';
import { SubscriptionService } from '../../services/subscription.service';
import { PageLoaderService } from '../../services/page-loader.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-health',
  templateUrl: './health.page.html',
  styleUrls: ['./health.page.scss'],
  standalone: false
})
export class HealthPage implements OnInit {
  // State
  isLoading = true;
  isLoadingInsight = false;

  // Health Data
  healthGoal!: HealthGoal;
  todayLog!: DailyLog;
  weeklyData: WeeklyDay[] = [];

  // Metrics & Progress
  avgCalories = 0;
  goalProgress = 0;
  streak = 0;
  miaInsight = '';

  // Macros percentages for gauge/rings
  proteinPercent = 0;
  carbsPercent = 0;
  fatPercent = 0;

  // Goal options
  goalOptions = ['Weight Loss', 'Muscle Gain', 'Balanced Diet', 'High Protein'];

  // Chart helpers
  maxChartCalories = 800;

  // Date display
  weekRangeLabel = '';

  get userName(): string {
    return this.auth.userName || 'MealMate User';
  }

  get userInitials(): string {
    return this.auth.userInitials;
  }

  constructor(
    private navCtrl: NavController,
    private auth: AuthService,
    private healthService: HealthService,
    private mealService: MealService,
    private subscriptionService: SubscriptionService,
    private pageLoader: PageLoaderService,
    public themeService: ThemeService
  ) { }

  ngOnInit() { }

  async ionViewWillEnter() {
    this.isLoading = true;
    this.pageLoader.show(true);
    const userId = this.auth.userId;
    if (!userId) {
      this.isLoading = false;
      this.pageLoader.show(false);
      return;
    }

    // Refresh meals list so nutrition data is available
    await this.mealService.refreshMeals();

    // Ensure subscriptions are loaded
    await this.subscriptionService.fetchUserSubscriptions(userId);

    // Auto-log meals from subscription history
    this.healthService.autoLogFromSubscription(userId);

    // Load all health data
    this.loadHealthData(userId);

    // Load AI insight in background
    this.loadMiaInsight(userId);

    setTimeout(() => {
      this.isLoading = false;
      this.pageLoader.show(false);
    }, 1000);
  }

  loadHealthData(userId: string) {
    // Goal
    this.healthGoal = this.healthService.getHealthGoal(userId);

    // Today's log
    this.todayLog = this.healthService.getTodayLog(userId);

    // Weekly data
    this.weeklyData = this.healthService.getWeeklyData(userId);

    // Set max chart calories for bar height scaling
    const maxCal = Math.max(...this.weeklyData.map(d => d.calories), this.healthGoal.targetCalories);
    this.maxChartCalories = maxCal > 0 ? maxCal : 800;

    // Streak
    this.streak = this.healthService.calculateStreak(userId);

    // Average
    this.avgCalories = this.healthService.getAverageCalories(userId);

    // Goal progress
    this.goalProgress = this.healthService.getWeeklyGoalProgress(userId);

    // Macro percentages (today)
    const targetProtein = this.healthGoal.targetProtein || 60;
    const targetCarbs = Math.round(this.healthGoal.targetCalories * 0.5 / 4); // 50% from carbs, 4 cal/g
    const targetFat = Math.round(this.healthGoal.targetCalories * 0.25 / 9);  // 25% from fat, 9 cal/g

    this.proteinPercent = Math.min(100, Math.round((this.todayLog.totalProtein / targetProtein) * 100));
    this.carbsPercent = Math.min(100, Math.round((this.todayLog.totalCarbs / targetCarbs) * 100));
    this.fatPercent = Math.min(100, Math.round((this.todayLog.totalFat / targetFat) * 100));

    // Week range label
    if (this.weeklyData.length >= 7) {
      const first = this.weeklyData[0].dateStr;
      const last = this.weeklyData[6].dateStr;
      const d1 = new Date(first);
      const d2 = new Date(last);
      this.weekRangeLabel = `${d1.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} — ${d2.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
    }
  }

  async loadMiaInsight(userId: string) {
    this.isLoadingInsight = true;
    this.miaInsight = await this.healthService.getMiaHealthInsight(userId);
    this.isLoadingInsight = false;
  }

  // ═══════════════════════════════════════════════════
  // User Actions
  // ═══════════════════════════════════════════════════

  onGoalChange(goalType: string) {
    const userId = this.auth.userId;
    if (!userId) return;

    this.healthGoal.goalType = goalType as any;
    const targets = this.healthService.getCalorieTargetForGoal(goalType);
    this.healthGoal.targetCalories = targets.calories;
    this.healthGoal.targetProtein = targets.protein;
    this.healthService.saveHealthGoal(this.healthGoal);

    // Refresh computed values
    this.loadHealthData(userId);

    // Refresh Mia insight with new goal context
    this.loadMiaInsight(userId);
  }

  onRateMeal(mealId: string, rating: number) {
    const userId = this.auth.userId;
    if (!userId) return;
    const today = new Date().toISOString().split('T')[0];
    this.healthService.rateMeal(userId, today, mealId, rating);
    // Refresh today log
    this.todayLog = this.healthService.getTodayLog(userId);
  }

  getBarHeight(calories: number): string {
    if (calories === 0) return '8px';
    const pct = Math.max(10, (calories / this.maxChartCalories) * 100);
    return `${Math.min(pct, 100)}%`;
  }

  getGoalRingDashoffset(): number {
    const circumference = 2 * Math.PI * 42; // r=42
    return circumference - (circumference * this.goalProgress) / 100;
  }

  getStars(rating: number): number[] {
    return [1, 2, 3, 4, 5];
  }

  goBack() {
    this.navCtrl.back();
  }
}
