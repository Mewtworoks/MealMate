import { Injectable } from '@angular/core';
import { Meal } from './meal.service';
import { SubscriptionService, Subscription } from './subscription.service';
import { AuthService } from './auth';
import { Gemini } from './gemini';

// ═══════════════════════════════════════════════════
// Health & Nutrition Data Models
// ═══════════════════════════════════════════════════

export interface LoggedMeal {
  mealId: string;
  mealName: string;
  image: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealTime: 'Breakfast' | 'Lunch' | 'Dinner';
  rating: number;          // 1-5, 0 = not rated
  deliveredAt: string;     // ISO timestamp
}

export interface DailyLog {
  userId: string;
  date: string;            // 'YYYY-MM-DD'
  meals: LoggedMeal[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface HealthGoal {
  userId: string;
  goalType: 'Weight Loss' | 'Muscle Gain' | 'Balanced Diet' | 'High Protein';
  targetCalories: number;
  targetProtein: number;
  startDate: string;
  currentStreak: number;
}

export interface WeeklyDay {
  dayName: string;
  dateStr: string;
  isToday: boolean;
  isFuture: boolean;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  onTrack: boolean;
  mealName: string;
}

// ═══════════════════════════════════════════════════
// Nutrition Database — calorie/macro lookup by meal name
// Used when the backend Meal model doesn't have nutrition data
// ═══════════════════════════════════════════════════
const NUTRITION_DB: { [key: string]: { calories: number; protein: number; carbs: number; fat: number } } = {
  'dal makhani':   { calories: 520, protein: 18, carbs: 60, fat: 14 },
  'paneer tikka':  { calories: 480, protein: 22, carbs: 45, fat: 18 },
  'veg pulao':     { calories: 410, protein: 10, carbs: 72, fat: 8 },
  'masala dosa':   { calories: 380, protein: 12, carbs: 70, fat: 6 },
  'mango lassi':   { calories: 240, protein: 8, carbs: 38, fat: 5 },
  'dal chawal':    { calories: 460, protein: 16, carbs: 68, fat: 10 },
  'palak paneer':  { calories: 440, protein: 20, carbs: 35, fat: 22 },
  'paneer':        { calories: 480, protein: 22, carbs: 45, fat: 18 },
  'salad':         { calories: 180, protein: 6, carbs: 25, fat: 4 },
  'daal':          { calories: 380, protein: 16, carbs: 55, fat: 8 },
  'roti':          { calories: 120, protein: 4, carbs: 22, fat: 2 },
  'biryani':       { calories: 550, protein: 18, carbs: 75, fat: 16 },
  'chole':         { calories: 350, protein: 14, carbs: 48, fat: 10 },
  'rajma':         { calories: 340, protein: 15, carbs: 50, fat: 8 },
  'aloo gobi':     { calories: 280, protein: 6, carbs: 42, fat: 10 },
  'default':       { calories: 420, protein: 14, carbs: 55, fat: 12 }
};

@Injectable({
  providedIn: 'root'
})
export class HealthService {

  constructor(
    private subscriptionService: SubscriptionService,
    private auth: AuthService,
    private gemini: Gemini
  ) {}

  // ═══════════════════════════════════════════════════
  // Nutrition Lookup
  // ═══════════════════════════════════════════════════

  getNutrition(meal: Meal | { name: string; price?: number }): { calories: number; protein: number; carbs: number; fat: number } {
    // If the meal has nutrition data, use it
    if ('calories' in meal && meal.calories && meal.calories > 0) {
      return {
        calories: (meal as any).calories || 420,
        protein: (meal as any).protein || 14,
        carbs: (meal as any).carbs || 55,
        fat: (meal as any).fat || 12
      };
    }

    // Otherwise, look up in our nutrition DB by name
    const name = (meal.name || '').toLowerCase();
    for (const key of Object.keys(NUTRITION_DB)) {
      if (key !== 'default' && name.includes(key)) {
        return NUTRITION_DB[key];
      }
    }

    // Fallback: generate semi-realistic values from the price
    const price = meal.price || 150;
    return {
      calories: 380 + (price % 120),
      protein: 10 + (price % 15),
      carbs: 45 + (price % 30),
      fat: 8 + (price % 10)
    };
  }

  // ═══════════════════════════════════════════════════
  // Daily Log CRUD
  // ═══════════════════════════════════════════════════

  private getLogKey(userId: string, date: string): string {
    return `health_log_${userId}_${date}`;
  }

  getDailyLog(userId: string, date: string): DailyLog {
    const key = this.getLogKey(userId, date);
    const stored = localStorage.getItem(key);
    if (stored) {
      try { return JSON.parse(stored); } catch {}
    }
    return { userId, date, meals: [], totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 };
  }

  saveDailyLog(log: DailyLog) {
    const key = this.getLogKey(log.userId, log.date);
    localStorage.setItem(key, JSON.stringify(log));
  }

  getTodayLog(userId: string): DailyLog {
    return this.getDailyLog(userId, this.todayStr());
  }

  // ═══════════════════════════════════════════════════
  // Auto-Log Meals from Subscription Rotation
  // ═══════════════════════════════════════════════════

  autoLogFromSubscription(userId: string) {
    const subs = this.subscriptionService.getUserSubscriptions(userId);
    const activeSub = subs.find(s => s.status === 'Active' || s.status === 'Paused');
    if (!activeSub) return;

    const startDate = new Date(activeSub.startDate);
    startDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Log each past day (up to 7 days back max) that hasn't been logged
    for (let d = 6; d >= 0; d--) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - d);
      if (checkDate < startDate) continue;

      const dateStr = this.dateToStr(checkDate);

      // Skip if it's a skipped or paused day
      if (activeSub.skippedDays?.includes(dateStr) || activeSub.pausedDays?.includes(dateStr)) continue;

      const log = this.getDailyLog(userId, dateStr);
      if (log.meals.length > 0) continue; // Already logged

      // Determine which meal was served on this day
      const dayNumber = Math.floor((checkDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const mealIndex = Math.abs(dayNumber) % activeSub.rotationMeals.length;
      const rotMeal = activeSub.rotationMeals[mealIndex];
      const nutrition = this.getNutrition(rotMeal);

      // For today: only log if it's past 1 PM (delivery time)
      if (d === 0 && new Date().getHours() < 13) continue;

      const loggedMeal: LoggedMeal = {
        mealId: rotMeal.mealId,
        mealName: rotMeal.name,
        image: '',
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat,
        mealTime: this.getMealTime(),
        rating: 0,
        deliveredAt: checkDate.toISOString()
      };

      log.meals.push(loggedMeal);
      log.totalCalories = nutrition.calories;
      log.totalProtein = nutrition.protein;
      log.totalCarbs = nutrition.carbs;
      log.totalFat = nutrition.fat;
      this.saveDailyLog(log);
    }
  }

  getMealTime(): 'Breakfast' | 'Lunch' | 'Dinner' {
    const hour = new Date().getHours();
    if (hour < 11) return 'Breakfast';
    if (hour < 16) return 'Lunch';
    return 'Dinner';
  }

  // ═══════════════════════════════════════════════════
  // Health Goal Management
  // ═══════════════════════════════════════════════════

  private getGoalKey(userId: string): string {
    return `health_goal_${userId}`;
  }

  getHealthGoal(userId: string): HealthGoal {
    const stored = localStorage.getItem(this.getGoalKey(userId));
    if (stored) {
      try { return JSON.parse(stored); } catch {}
    }
    return this.createDefaultGoal(userId);
  }

  createDefaultGoal(userId: string): HealthGoal {
    const goal: HealthGoal = {
      userId,
      goalType: 'Balanced Diet',
      targetCalories: 2000,
      targetProtein: 60,
      startDate: new Date().toISOString(),
      currentStreak: 0
    };
    this.saveHealthGoal(goal);
    return goal;
  }

  saveHealthGoal(goal: HealthGoal) {
    localStorage.setItem(this.getGoalKey(goal.userId), JSON.stringify(goal));
  }

  getCalorieTargetForGoal(goalType: string): { calories: number; protein: number } {
    switch (goalType) {
      case 'Weight Loss':   return { calories: 1600, protein: 50 };
      case 'Muscle Gain':   return { calories: 2800, protein: 100 };
      case 'High Protein':  return { calories: 2200, protein: 90 };
      default:              return { calories: 2000, protein: 60 };
    }
  }

  // ═══════════════════════════════════════════════════
  // Weekly Data (for bar chart)
  // ═══════════════════════════════════════════════════

  getWeeklyData(userId: string): WeeklyDay[] {
    const goal = this.getHealthGoal(userId);
    const result: WeeklyDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const subs = this.subscriptionService.getUserSubscriptions(userId);
    const activeSub = subs.find(s => s.status === 'Active' || s.status === 'Paused');

    for (let d = 6; d >= 0; d--) {
      const date = new Date(today);
      date.setDate(date.getDate() - d);
      const dateStr = this.dateToStr(date);
      const log = this.getDailyLog(userId, dateStr);

      let mealName = log.meals.length > 0 ? log.meals[0].mealName : '';
      let calories = log.totalCalories;
      let protein = log.totalProtein;
      let carbs = log.totalCarbs;
      let fat = log.totalFat;

      // If no logged meal for this day, pull from active subscription rotation!
      if (!mealName && activeSub && activeSub.rotationMeals && activeSub.rotationMeals.length > 0) {
        const start = new Date(activeSub.startDate);
        start.setHours(0, 0, 0, 0);
        let dayDiff = Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const rotIndex = Math.abs(dayDiff) % activeSub.rotationMeals.length;
        const rotMeal = activeSub.rotationMeals[rotIndex];
        if (rotMeal) {
          mealName = rotMeal.name;
          const nut = this.getNutrition(rotMeal);
          calories = nut.calories;
          protein = nut.protein;
          carbs = nut.carbs;
          fat = nut.fat;
        }
      }

      result.push({
        dayName: date.toLocaleDateString('en-IN', { weekday: 'short' }),
        dateStr,
        isToday: d === 0,
        isFuture: false,
        calories,
        protein,
        carbs,
        fat,
        onTrack: calories > 0 && Math.abs(calories - goal.targetCalories) <= 350,
        mealName
      });
    }
    return result;
  }

  // ═══════════════════════════════════════════════════
  // Streak Calculation
  // ═══════════════════════════════════════════════════

  calculateStreak(userId: string): number {
    const goal = this.getHealthGoal(userId);
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count backwards from yesterday
    for (let d = 1; d <= 30; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() - d);
      const dateStr = this.dateToStr(date);
      const log = this.getDailyLog(userId, dateStr);

      if (log.totalCalories > 0 && Math.abs(log.totalCalories - goal.targetCalories) <= 300) {
        streak++;
      } else if (log.totalCalories > 0) {
        break; // Streak broken
      } else {
        break; // No data = streak broken
      }
    }

    // Check if today also counts (has data)
    const todayLog = this.getTodayLog(userId);
    if (todayLog.totalCalories > 0 && Math.abs(todayLog.totalCalories - goal.targetCalories) <= 300) {
      streak++;
    }

    return streak;
  }

  // ═══════════════════════════════════════════════════
  // Goal Progress (% of on-track days this week)
  // ═══════════════════════════════════════════════════

  getWeeklyGoalProgress(userId: string): number {
    const weekly = this.getWeeklyData(userId);
    const daysWithData = weekly.filter(d => d.calories > 0);
    if (daysWithData.length === 0) return 0;
    const onTrackDays = daysWithData.filter(d => d.onTrack).length;
    return Math.round((onTrackDays / daysWithData.length) * 100);
  }

  // ═══════════════════════════════════════════════════
  // Meal Rating
  // ═══════════════════════════════════════════════════

  rateMeal(userId: string, date: string, mealId: string, rating: number) {
    const log = this.getDailyLog(userId, date);
    const meal = log.meals.find(m => m.mealId === mealId);
    if (meal) {
      meal.rating = rating;
      this.saveDailyLog(log);
    }
  }

  // ═══════════════════════════════════════════════════
  // Average Weekly Calories
  // ═══════════════════════════════════════════════════

  getAverageCalories(userId: string): number {
    const weekly = this.getWeeklyData(userId);
    const daysWithData = weekly.filter(d => d.calories > 0);
    if (daysWithData.length === 0) return 0;
    return Math.round(daysWithData.reduce((s, d) => s + d.calories, 0) / daysWithData.length);
  }

  // ═══════════════════════════════════════════════════
  // Gemini AI Health Insight (Mia)
  // ═══════════════════════════════════════════════════

  async getMiaHealthInsight(userId: string): Promise<string> {
    const goal = this.getHealthGoal(userId);
    const weekly = this.getWeeklyData(userId);
    const todayLog = this.getTodayLog(userId);
    const avgCal = this.getAverageCalories(userId);
    const streak = this.calculateStreak(userId);

    // Get tomorrow's expected meal
    const subs = this.subscriptionService.getUserSubscriptions(userId);
    const activeSub = subs.find(s => s.status === 'Active');
    let tomorrowMeal = 'not subscribed';
    if (activeSub) {
      const startDate = new Date(activeSub.startDate);
      startDate.setHours(0, 0, 0, 0);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const dayNum = Math.floor((tomorrow.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (dayNum >= 0) {
        const idx = dayNum % activeSub.rotationMeals.length;
        const rm = activeSub.rotationMeals[idx];
        const nutr = this.getNutrition(rm);
        tomorrowMeal = `${rm.name} (${nutr.calories} kcal, ${nutr.protein}g protein)`;
      }
    }

    const context = `
User goal: ${goal.goalType}
Daily calorie target: ${goal.targetCalories} kcal
Daily protein target: ${goal.targetProtein}g
Today's intake: ${todayLog.totalCalories} kcal, ${todayLog.totalProtein}g protein
This week average: ${avgCal} kcal/day
Days on track this week: ${weekly.filter(d => d.onTrack).length}/7
Tomorrow's meal: ${tomorrowMeal}
Current streak: ${streak} days
Meals this week: ${weekly.filter(d => d.mealName).map(d => `${d.dayName}: ${d.mealName} (${d.calories} kcal)`).join(', ')}
    `.trim();

    try {
      const model = this.gemini['genAI'].getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `You are Mia, MealMate's friendly AI nutritionist. Based on this user's weekly nutrition data:

${context}

Give ONE specific, actionable health tip in 2-3 short lines max.
Be warm and encouraging. Mix Hindi and English naturally (Hinglish).
Mention tomorrow's meal specifically if relevant.
Never give generic advice — always reference their actual calorie/protein data.
Do not use markdown formatting. Keep it conversational.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (e) {
      console.error('Mia insight error:', e);
      // Fallback static insight
      if (avgCal > 0) {
        return `You averaged ${avgCal} kcal this week — ${avgCal < goal.targetCalories ? 'thoda aur khao' : 'great balance'}! ${streak > 0 ? `${streak}-day streak going strong 💪` : 'Let\'s start a streak today!'}`;
      }
      return 'Start tracking your meals to get personalized insights from Mia! 🍽️';
    }
  }

  // ═══════════════════════════════════════════════════
  // Utility
  // ═══════════════════════════════════════════════════

  private todayStr(): string {
    return this.dateToStr(new Date());
  }

  private dateToStr(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
