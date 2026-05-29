import { Component, OnInit } from '@angular/core';
import { NavController, ToastController } from '@ionic/angular';
import { MealService, Meal } from '../../services/meal.service';
import { SubscriptionService, Subscription, RotationMeal } from '../../services/subscription.service';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-manage-rotation',
  templateUrl: './manage-rotation.page.html',
  styleUrls: ['./manage-rotation.page.scss'],
  standalone: false
})
export class ManageRotationPage implements OnInit {
  activeSub: Subscription | null = null;
  meals: Meal[] = [];

  // Tab state
  activeTab: 'rotation' | 'swap' | 'schedule' = 'rotation';

  // Tab 1: Editable rotation
  editableRotation: any[] = [];
  dragFromIndex: number | null = null;
  initialMealsCount = 0;

  // Tab 2: Swap state
  swappingMealId: string | null = null;
  swappingMealName = '';
  availableMealsForSwap: any[] = [];

  // Tab 3: 7-day schedule
  upcomingSchedule: any[] = [];

  // Track unsaved changes
  hasUnsavedChanges = false;

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private mealService: MealService,
    private subscriptionService: SubscriptionService,
    private auth: AuthService
  ) {}

  async ngOnInit() {
    this.mealService.meals$.subscribe(m => this.meals = m);
    this.mealService.refreshMeals();
    await this.loadActiveSub();
  }

  goBack() {
    this.navCtrl.back();
  }

  async loadActiveSub() {
    const userId = this.auth.userId;
    if (!userId) return;
    await this.subscriptionService.fetchUserSubscriptions(userId);
    const subs = this.subscriptionService.getUserSubscriptions(userId);
    this.activeSub = subs.find(s => s.status === 'Active') || null;
    if (this.activeSub) {
      if (this.initialMealsCount === 0) {
        this.initialMealsCount = this.activeSub.rotationMeals.length;
      }
      this.buildEditableRotation();
      this.buildAvailableMealsForSwap();
      this.buildUpcomingSchedule();
    }
  }

  setTab(tab: 'rotation' | 'swap' | 'schedule') {
    this.activeTab = tab;
    if (tab === 'swap') {
      this.swappingMealId = null;
      this.buildAvailableMealsForSwap();
    }
    if (tab === 'schedule') {
      this.buildUpcomingSchedule();
    }
  }

  // ═══════════════════════════════════════════════════
  // TAB 1: CURRENT ROTATION (Reorder / Remove)
  // ═══════════════════════════════════════════════════

  buildEditableRotation() {
    if (!this.activeSub) return;
    this.editableRotation = this.activeSub.rotationMeals.map((rm, i) => {
      let dayLabel = `Day ${i + 1}`;
      if (i === 0) dayLabel = `Day 1 • Today`;
      else if (i === 1) dayLabel = `Day 2 • Tomorrow`;
      else if (i === 2) dayLabel = `Day 3 • Day after`;
      else dayLabel = `Day ${i + 1} • In ${i} days`;

      return {
        mealId: rm.mealId,
        name: rm.name,
        price: rm.price,
        image: this.getMealImage(rm.name),
        dayLabel: dayLabel,
        calories: this.getMealCalories(rm.name),
        position: i
      };
    });
  }

  getMealCalories(name: string): number {
    const found = this.meals.find(m => m.name.toLowerCase().includes(name.toLowerCase().split(' ')[0]));
    if (found && found.calories) return found.calories;

    const lower = name.toLowerCase();
    if (lower.includes('dal')) return 520;
    if (lower.includes('paneer')) return 480;
    if (lower.includes('dosa') || lower.includes('pulao') || lower.includes('veg')) return 510;
    if (lower.includes('salad')) return 350;
    if (lower.includes('palak')) return 420;
    return 450;
  }

  onDragStart(index: number) {
    this.dragFromIndex = index;
  }

  onDragOver(event: Event) {
    event.preventDefault();
  }

  onDrop(toIndex: number) {
    if (this.dragFromIndex === null || this.dragFromIndex === toIndex) {
      this.dragFromIndex = null;
      return;
    }
    const item = this.editableRotation.splice(this.dragFromIndex, 1)[0];
    this.editableRotation.splice(toIndex, 0, item);
    this.editableRotation.forEach((rm, i) => rm.dayLabel = `Day ${i + 1}`);
    this.dragFromIndex = null;
    this.hasUnsavedChanges = true;
  }

  moveMealUp(index: number) {
    if (index <= 0) return;
    const temp = this.editableRotation[index];
    this.editableRotation[index] = this.editableRotation[index - 1];
    this.editableRotation[index - 1] = temp;
    this.editableRotation.forEach((rm, i) => rm.dayLabel = `Day ${i + 1}`);
    this.hasUnsavedChanges = true;
  }

  moveMealDown(index: number) {
    if (index >= this.editableRotation.length - 1) return;
    const temp = this.editableRotation[index];
    this.editableRotation[index] = this.editableRotation[index + 1];
    this.editableRotation[index + 1] = temp;
    this.editableRotation.forEach((rm, i) => rm.dayLabel = `Day ${i + 1}`);
    this.hasUnsavedChanges = true;
  }

  async removeFromPool(index: number) {
    if (!this.activeSub || this.editableRotation.length <= 3) {
      this.showToast('You must keep at least 3 meals in rotation');
      return;
    }

    const meal = this.editableRotation[index];
    this.editableRotation.splice(index, 1);
    this.editableRotation.forEach((rm, i) => rm.dayLabel = `Day ${i + 1}`);
    await this.subscriptionService.removeMealFromPool(this.activeSub.id, meal.mealId);
    // Reload activeSub from service to get the single source of truth
    this.reloadActiveSub();
    this.buildAvailableMealsForSwap();
    this.showToast(`${meal.name} removed from rotation`);
  }

  async saveRotationOrder() {
    if (!this.activeSub) return;
    const reordered = this.editableRotation.map(rm => ({
      mealId: rm.mealId,
      name: rm.name,
      price: rm.price
    }));
    await this.subscriptionService.reorderMeals(this.activeSub.id, reordered);
    this.reloadActiveSub();
    this.hasUnsavedChanges = false;
    this.showToast('Rotation order saved! 🔄');
    this.goBack();
  }

  // ═══════════════════════════════════════════════════
  // TAB 2: SWAP / ADD
  // ═══════════════════════════════════════════════════

  buildAvailableMealsForSwap() {
    if (!this.activeSub) return;
    const currentIds = this.activeSub.rotationMeals.map(m => m.mealId);
    this.availableMealsForSwap = this.meals
      .filter(m => !currentIds.includes(m.id))
      .map(m => ({
        id: m.id,
        name: m.name,
        price: m.price,
        image: m.image,
        type: m.type
      }));
  }

  startSwap(mealId: string, mealName: string) {
    this.swappingMealId = mealId;
    this.swappingMealName = mealName;
    this.buildAvailableMealsForSwap();
  }

  cancelSwap() {
    this.swappingMealId = null;
    this.swappingMealName = '';
  }

  async confirmSwap(newMeal: any) {
    if (!this.activeSub || !this.swappingMealId) return;
    const rotMeal: RotationMeal = { mealId: newMeal.id, name: newMeal.name, price: newMeal.price };
    // Service already mutates the sub's rotationMeals array, don't double-mutate
    await this.subscriptionService.swapMeal(this.activeSub.id, this.swappingMealId, rotMeal);

    this.swappingMealId = null;
    this.swappingMealName = '';
    // Reload from service to get single source of truth
    this.reloadActiveSub();
    this.buildEditableRotation();
    this.buildAvailableMealsForSwap();
    this.showToast(`Swapped to ${newMeal.name}! Takes effect tomorrow 🔄`);
  }

  async addToPool(meal: any) {
    if (!this.activeSub) return;
    const rotMeal: RotationMeal = { mealId: meal.id, name: meal.name, price: meal.price };
    // Service's addMealToPool already pushes to rotationMeals — don't push again!
    await this.subscriptionService.addMealToPool(this.activeSub.id, rotMeal);
    // Reload from service to get single source of truth
    this.reloadActiveSub();
    this.buildEditableRotation();
    this.buildAvailableMealsForSwap();
    this.showToast(`${meal.name} added to rotation pool! 🎉`);
  }

  /**
   * Save all rotation changes (swap tab).
   * Persists the current editableRotation as the new order.
   */
  async saveAllChanges() {
    if (!this.activeSub) return;
    const updated = this.editableRotation.map(rm => ({
      mealId: rm.mealId,
      name: rm.name,
      price: rm.price
    }));
    await this.subscriptionService.reorderMeals(this.activeSub.id, updated);
    this.reloadActiveSub();
    this.hasUnsavedChanges = false;
    this.showToast('All changes saved! ✅');
    this.goBack();
  }

  // ═══════════════════════════════════════════════════
  // TAB 3: SKIP & PAUSE
  // ═══════════════════════════════════════════════════

  buildUpcomingSchedule() {
    if (!this.activeSub || this.activeSub.rotationMeals.length === 0) return;

    const rotation = this.activeSub.rotationMeals;
    const start = new Date(this.activeSub.startDate);
    start.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const elapsedDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    this.upcomingSchedule = [];

    for (let d = 0; d < 7; d++) {
      const date = new Date(now);
      date.setDate(date.getDate() + d);
      const dateStr = date.toISOString().split('T')[0];
      const dayOffset = elapsedDays + d;
      const mealIdx = dayOffset % rotation.length;
      const meal = rotation[mealIdx];

      this.upcomingSchedule.push({
        date,
        dateStr,
        dayName: date.toLocaleDateString('en-IN', { weekday: 'short' }),
        dayNum: date.getDate(),
        monthStr: date.toLocaleDateString('en-IN', { month: 'short' }),
        isToday: d === 0,
        isSkipped: this.activeSub!.skippedDays?.includes(dateStr) || false,
        isPaused: this.activeSub!.pausedDays?.includes(dateStr) || false,
        meal: {
          mealId: meal.mealId,
          name: meal.name,
          price: meal.price,
          image: this.getMealImage(meal.name)
        }
      });
    }
  }

  async toggleSkipDay(dateStr: string) {
    if (!this.activeSub) return;
    const entry = this.upcomingSchedule.find((e: any) => e.dateStr === dateStr);
    if (!entry || entry.isToday) {
      this.showToast("Today's meal cannot be changed");
      return;
    }
    if (entry.isSkipped) {
      await this.subscriptionService.unskipDay(this.activeSub.id, dateStr);
      entry.isSkipped = false;
      this.showToast('Skip removed — meal restored');
    } else {
      await this.subscriptionService.skipDay(this.activeSub.id, dateStr);
      entry.isSkipped = true;
      this.showToast('Day skipped — plan extended by 1 day ⏭️');
    }
    this.reloadActiveSub();
    this.buildUpcomingSchedule();
  }

  async togglePauseDay(dateStr: string) {
    if (!this.activeSub) return;
    const entry = this.upcomingSchedule.find((e: any) => e.dateStr === dateStr);
    if (!entry || entry.isToday) {
      this.showToast("Today's delivery cannot be paused");
      return;
    }
    if (entry.isPaused) {
      await this.subscriptionService.unpauseDay(this.activeSub.id, dateStr);
      entry.isPaused = false;
      this.showToast('Day resumed ▶️');
    } else {
      await this.subscriptionService.pauseDay(this.activeSub.id, dateStr);
      entry.isPaused = true;
      this.showToast('Day paused — plan extended by 1 day ⏸️');
    }
    this.reloadActiveSub();
    this.buildUpcomingSchedule();
  }

  // ═══════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════

  /**
   * Reload activeSub from the subscription service to get
   * the single source of truth after any mutation.
   * Prevents the double-add/double-remove bug.
   */
  private reloadActiveSub() {
    const userId = this.auth.userId;
    if (!userId) return;
    const subs = this.subscriptionService.getUserSubscriptions(userId);
    this.activeSub = subs.find(s => s.status === 'Active') || null;
  }

  getMealImage(name: string): string {
    const found = this.meals.find(m => m.name.toLowerCase().includes(name.toLowerCase().split(' ')[0]));
    if (found) return found.image;

    const lower = name.toLowerCase();
    if (lower.includes('dal')) return 'assets/onboarding/dal_makhani.png';
    if (lower.includes('paneer')) return 'assets/onboarding/paneer_tikka.png';
    if (lower.includes('dosa') || lower.includes('pulao') || lower.includes('veg')) return 'assets/onboarding/veg_pulao.png';
    if (lower.includes('salad')) return 'assets/onboarding/salad_bowl.png';
    if (lower.includes('palak')) return 'assets/onboarding/palak_paneer.png';
    return 'assets/onboarding/dal_makhani.png';
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
