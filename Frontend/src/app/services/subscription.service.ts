import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RotationMeal {
  mealId: string;
  name: string;
  price: number;
}

export interface Subscription {
  id: string;
  customerId: string;
  startDate: string; // ISO or date string
  endDate: string; // ISO or date string
  months: number;
  status: 'Active' | 'Paused' | 'Expired' | 'Cancelled';
  rotationMeals: RotationMeal[];
  totalDays: number;
  currentDay: number;
  totalPaid: number;
  dailyDeduction: number;
  planName?: string;
  planTagline?: string;
  skippedDays?: string[];  // ISO date strings of one-time skips
  pausedDays?: string[];   // ISO date strings of paused specific days
}

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private _subscriptions = new BehaviorSubject<Subscription[]>([]);
  subscriptions$ = this._subscriptions.asObservable();

  constructor(private http: HttpClient) {
    this.loadSubscriptionsLocal();
  }

  private loadSubscriptionsLocal() {
    const subsStr = localStorage.getItem('mealmate_subscriptions');
    if (subsStr) {
      try {
        this._subscriptions.next(JSON.parse(subsStr));
      } catch (e) {
        console.error('Error loading subscriptions from localStorage', e);
      }
    }
  }

  private saveSubscriptionsLocal(subs: Subscription[]) {
    localStorage.setItem('mealmate_subscriptions', JSON.stringify(subs));
    this._subscriptions.next(subs);
  }

  private mapBackendToSubscription(b: any): Subscription {
    return {
      id: b.Id || b.id,
      customerId: b.CustomerId || b.customerId,
      startDate: b.StartDate || b.startDate,
      endDate: b.EndDate || b.endDate,
      months: b.Months || b.months,
      status: b.Status || b.status,
      totalDays: b.TotalDays || b.totalDays,
      currentDay: b.CurrentDay || b.currentDay,
      totalPaid: b.TotalPaid || b.totalPaid,
      dailyDeduction: b.DailyDeduction || b.dailyDeduction,
      planName: b.PlanName || b.planName,
      planTagline: `${b.TotalDays || b.totalDays} days • ₹${Math.round(b.DailyDeduction || b.dailyDeduction)}/day`,
      rotationMeals: (b.RotationMeals || b.rotationMeals || []).map((m: any) => ({
        mealId: m.MealId || m.mealId,
        name: m.Name || m.name,
        price: m.Price || m.price
      })),
      skippedDays: b.SkippedDays || b.skippedDays || [],
      pausedDays: b.PausedDays || b.pausedDays || []
    };
  }

  getUserSubscriptions(customerId: string): Subscription[] {
    return this._subscriptions.value.filter(s => s.customerId === customerId);
  }

  async fetchUserSubscriptions(customerId: string): Promise<Subscription[]> {
    if (!customerId || customerId.startsWith('user_')) {
      return this.getUserSubscriptions(customerId);
    }
    try {
      const backendSubs = await firstValueFrom(
        this.http.get<any[]>(`${environment.apiUrl}/subscriptions/customer/${customerId}`)
      );
      const mapped = backendSubs.map(s => this.mapBackendToSubscription(s));
      this.saveSubscriptionsLocal(mapped);
      return mapped;
    } catch (error) {
      console.error('Failed to fetch subscriptions from server, falling back to local storage:', error);
      return this.getUserSubscriptions(customerId);
    }
  }

  async createSubscription(data: {
    customerId: string,
    months: number,
    rotationMeals: RotationMeal[],
    startDate: Date,
    totalPaid: number
  }): Promise<Subscription> {
    const payload = {
      CustomerId: data.customerId,
      Months: data.months,
      TotalPaid: data.totalPaid,
      PlanName: `${data.months} Month${data.months > 1 ? 's' : ''} Plan`,
      RotationMeals: data.rotationMeals.map(rm => ({
        MealId: rm.mealId,
        Name: rm.name,
        Price: rm.price
      }))
    };

    try {
      const res = await firstValueFrom(
        this.http.post<any>(`${environment.apiUrl}/subscriptions`, payload)
      );
      const sub = this.mapBackendToSubscription(res);
      
      const updated = [...this._subscriptions.value.filter(s => s.id !== sub.id), sub];
      this.saveSubscriptionsLocal(updated);
      return sub;
    } catch (error) {
      console.error('Failed to create subscription on server, creating locally:', error);
      // Local fallback in case server is down
      const totalDays = data.months * 30;
      const endDate = new Date(data.startDate);
      endDate.setDate(endDate.getDate() + totalDays);

      const sub: Subscription = {
        id: 'SUB-' + Math.floor(Math.random() * 1000000),
        customerId: data.customerId,
        startDate: data.startDate.toISOString(),
        endDate: endDate.toISOString(),
        months: data.months,
        status: 'Active',
        rotationMeals: data.rotationMeals,
        totalDays: totalDays,
        currentDay: 1,
        totalPaid: data.totalPaid,
        dailyDeduction: data.totalPaid / totalDays,
        planName: payload.PlanName,
        skippedDays: [],
        pausedDays: []
      };

      const updated = [...this._subscriptions.value, sub];
      this.saveSubscriptionsLocal(updated);
      return sub;
    }
  }

  async swapMeal(subId: string, oldMealId: string, newMeal: RotationMeal) {
    const payload = {
      OldMealId: oldMealId,
      NewMealId: newMeal.mealId,
      NewMealName: newMeal.name,
      NewMealPrice: newMeal.price
    };

    try {
      const res = await firstValueFrom(
        this.http.patch<any>(`${environment.apiUrl}/subscriptions/${subId}/swap`, payload)
      );
      const updatedSub = this.mapBackendToSubscription(res);
      const updatedList = this._subscriptions.value.map(s => s.id === subId ? updatedSub : s);
      this.saveSubscriptionsLocal(updatedList);
    } catch (error) {
      console.error('Failed to swap meal on server, running offline logic:', error);
      // Local fallback
      const subs = [...this._subscriptions.value];
      const sub = subs.find(s => s.id === subId);
      if (sub) {
        const idx = sub.rotationMeals.findIndex(m => m.mealId === oldMealId);
        if (idx > -1) {
          sub.rotationMeals[idx] = newMeal;
          this.saveSubscriptionsLocal(subs);
        }
      }
    }
  }

  async reorderMeals(subId: string, reorderedMeals: RotationMeal[]) {
    const payload = {
      Meals: reorderedMeals.map(rm => ({
        MealId: rm.mealId,
        Name: rm.name,
        Price: rm.price
      }))
    };

    try {
      const res = await firstValueFrom(
        this.http.patch<any>(`${environment.apiUrl}/subscriptions/${subId}/reorder`, payload)
      );
      const updatedSub = this.mapBackendToSubscription(res);
      const updatedList = this._subscriptions.value.map(s => s.id === subId ? updatedSub : s);
      this.saveSubscriptionsLocal(updatedList);
    } catch (error) {
      console.error('Failed to reorder meals on server, running offline logic:', error);
      // Local fallback
      const subs = [...this._subscriptions.value];
      const sub = subs.find(s => s.id === subId);
      if (sub) {
        sub.rotationMeals = reorderedMeals;
        this.saveSubscriptionsLocal(subs);
      }
    }
  }

  async addMealToPool(subId: string, meal: RotationMeal) {
    const payload = {
      MealId: meal.mealId,
      Name: meal.name,
      Price: meal.price
    };

    try {
      const res = await firstValueFrom(
        this.http.post<any>(`${environment.apiUrl}/subscriptions/${subId}/pool`, payload)
      );
      const updatedSub = this.mapBackendToSubscription(res);
      const updatedList = this._subscriptions.value.map(s => s.id === subId ? updatedSub : s);
      this.saveSubscriptionsLocal(updatedList);
    } catch (error) {
      console.error('Failed to add meal to pool on server, running offline logic:', error);
      // Local fallback
      const subs = [...this._subscriptions.value];
      const sub = subs.find(s => s.id === subId);
      if (sub) {
        const exists = sub.rotationMeals.some(m => m.mealId === meal.mealId);
        if (!exists) {
          sub.rotationMeals.push(meal);
          this.saveSubscriptionsLocal(subs);
        }
      }
    }
  }

  async removeMealFromPool(subId: string, mealId: string) {
    try {
      const res = await firstValueFrom(
        this.http.delete<any>(`${environment.apiUrl}/subscriptions/${subId}/pool/${mealId}`)
      );
      const updatedSub = this.mapBackendToSubscription(res);
      const updatedList = this._subscriptions.value.map(s => s.id === subId ? updatedSub : s);
      this.saveSubscriptionsLocal(updatedList);
    } catch (error) {
      console.error('Failed to remove meal from server, running offline logic:', error);
      // Local fallback
      const subs = [...this._subscriptions.value];
      const sub = subs.find(s => s.id === subId);
      if (sub && sub.rotationMeals.length > 1) {
        sub.rotationMeals = sub.rotationMeals.filter(m => m.mealId !== mealId);
        this.saveSubscriptionsLocal(subs);
      }
    }
  }

  async skipDay(subId: string, dateStr: string) {
    try {
      const res = await firstValueFrom(
        this.http.post<any>(`${environment.apiUrl}/subscriptions/${subId}/skip`, { DateStr: dateStr })
      );
      const updatedSub = this.mapBackendToSubscription(res);
      const updatedList = this._subscriptions.value.map(s => s.id === subId ? updatedSub : s);
      this.saveSubscriptionsLocal(updatedList);
    } catch (error) {
      console.error('Failed to skip day on server, running offline logic:', error);
      // Local fallback
      const subs = [...this._subscriptions.value];
      const sub = subs.find(s => s.id === subId);
      if (sub) {
        if (!sub.skippedDays) sub.skippedDays = [];
        if (!sub.skippedDays.includes(dateStr)) {
          sub.skippedDays.push(dateStr);
          this.extendEndDate(sub, 1);
          this.saveSubscriptionsLocal(subs);
        }
      }
    }
  }

  async unskipDay(subId: string, dateStr: string) {
    try {
      const res = await firstValueFrom(
        this.http.delete<any>(`${environment.apiUrl}/subscriptions/${subId}/skip`, {
          body: { DateStr: dateStr }
        })
      );
      const updatedSub = this.mapBackendToSubscription(res);
      const updatedList = this._subscriptions.value.map(s => s.id === subId ? updatedSub : s);
      this.saveSubscriptionsLocal(updatedList);
    } catch (error) {
      console.error('Failed to unskip day on server, running offline logic:', error);
      // Local fallback
      const subs = [...this._subscriptions.value];
      const sub = subs.find(s => s.id === subId);
      if (sub && sub.skippedDays) {
        sub.skippedDays = sub.skippedDays.filter(d => d !== dateStr);
        this.extendEndDate(sub, -1);
        this.saveSubscriptionsLocal(subs);
      }
    }
  }

  async pauseDay(subId: string, dateStr: string) {
    try {
      const res = await firstValueFrom(
        this.http.post<any>(`${environment.apiUrl}/subscriptions/${subId}/pause`, { DateStr: dateStr })
      );
      const updatedSub = this.mapBackendToSubscription(res);
      const updatedList = this._subscriptions.value.map(s => s.id === subId ? updatedSub : s);
      this.saveSubscriptionsLocal(updatedList);
    } catch (error) {
      console.error('Failed to pause day on server, running offline logic:', error);
      // Local fallback
      const subs = [...this._subscriptions.value];
      const sub = subs.find(s => s.id === subId);
      if (sub) {
        if (!sub.pausedDays) sub.pausedDays = [];
        if (!sub.pausedDays.includes(dateStr)) {
          sub.pausedDays.push(dateStr);
          this.extendEndDate(sub, 1);
          this.saveSubscriptionsLocal(subs);
        }
      }
    }
  }

  async unpauseDay(subId: string, dateStr: string) {
    try {
      const res = await firstValueFrom(
        this.http.delete<any>(`${environment.apiUrl}/subscriptions/${subId}/pause`, {
          body: { DateStr: dateStr }
        })
      );
      const updatedSub = this.mapBackendToSubscription(res);
      const updatedList = this._subscriptions.value.map(s => s.id === subId ? updatedSub : s);
      this.saveSubscriptionsLocal(updatedList);
    } catch (error) {
      console.error('Failed to unpause day on server, running offline logic:', error);
      // Local fallback
      const subs = [...this._subscriptions.value];
      const sub = subs.find(s => s.id === subId);
      if (sub && sub.pausedDays) {
        sub.pausedDays = sub.pausedDays.filter(d => d !== dateStr);
        this.extendEndDate(sub, -1);
        this.saveSubscriptionsLocal(subs);
      }
    }
  }

  async pauseSubscription(subId: string) {
    try {
      const res = await firstValueFrom(
        this.http.post<any>(`${environment.apiUrl}/subscriptions/${subId}/pause-plan`, {})
      );
      const updatedSub = this.mapBackendToSubscription(res);
      const updatedList = this._subscriptions.value.map(s => s.id === subId ? updatedSub : s);
      this.saveSubscriptionsLocal(updatedList);
    } catch (error) {
      console.error('Failed to pause subscription on server, running offline logic:', error);
      // Local fallback
      const subs = [...this._subscriptions.value];
      const sub = subs.find(s => s.id === subId);
      if (sub && sub.status === 'Active') {
        sub.status = 'Paused';
        this.saveSubscriptionsLocal(subs);
      }
    }
  }

  async resumeSubscription(subId: string) {
    try {
      const res = await firstValueFrom(
        this.http.post<any>(`${environment.apiUrl}/subscriptions/${subId}/resume-plan`, {})
      );
      const updatedSub = this.mapBackendToSubscription(res);
      const updatedList = this._subscriptions.value.map(s => s.id === subId ? updatedSub : s);
      this.saveSubscriptionsLocal(updatedList);
    } catch (error) {
      console.error('Failed to resume subscription on server, running offline logic:', error);
      // Local fallback
      const subs = [...this._subscriptions.value];
      const sub = subs.find(s => s.id === subId);
      if (sub && sub.status === 'Paused') {
        sub.status = 'Active';
        this.saveSubscriptionsLocal(subs);
      }
    }
  }

  async cancelSubscription(subId: string): Promise<any> {
    try {
      const res = await firstValueFrom(
        this.http.post<any>(`${environment.apiUrl}/subscriptions/${subId}/cancel`, {})
      );
      const updatedSub = this.mapBackendToSubscription(res.Subscription || res.subscription || res);
      const updatedList = this._subscriptions.value.map(s => s.id === subId ? updatedSub : s);
      this.saveSubscriptionsLocal(updatedList);
      return res;
    } catch (error) {
      console.error('Failed to cancel subscription on server, running offline logic:', error);
      // Local fallback
      const subs = [...this._subscriptions.value];
      const sub = subs.find(s => s.id === subId);
      if (sub) {
        sub.status = 'Cancelled';
        this.saveSubscriptionsLocal(subs);
      }
      return { RefundAmount: 0 };
    }
  }

  getTodaysMeal(subscription: Subscription): RotationMeal {
    const start = new Date(subscription.startDate);
    const today = new Date();

    // Normalize to midnight to get purely the day difference
    start.setHours(0, 0, 0, 0);
    const todayNormalized = new Date();
    todayNormalized.setHours(0, 0, 0, 0);

    let dayNumber = Math.floor(
      (todayNormalized.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );

    // If day is somehow negative (started in future), fallback to 0
    if (dayNumber < 0) dayNumber = 0;

    const index = dayNumber % subscription.rotationMeals.length;
    return subscription.rotationMeals[index];
  }

  getSchedule(subscription: Subscription): any[] {
    const schedule = [];
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const startDate = new Date(subscription.startDate);
    startDate.setHours(0, 0, 0, 0);

    const daysElapsed = Math.floor((todayDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    for (let i = 0; i < subscription.totalDays; i++) {
      const mealIndex = i % subscription.rotationMeals.length;
      const meal = subscription.rotationMeals[mealIndex];

      let status = '⏳ Upcoming';
      let statusClass = 'upcoming';

      if (i < daysElapsed) {
        status = '✅ Delivered';
        statusClass = 'delivered';
      } else if (i === daysElapsed) {
        status = '🔄 Today';
        statusClass = 'today';
      }

      schedule.push({
        day: i + 1,
        mealName: meal.name,
        status: status,
        statusClass: statusClass
      });
    }
    return schedule;
  }

  private extendEndDate(sub: Subscription, days: number) {
    const end = new Date(sub.endDate);
    end.setDate(end.getDate() + days);
    sub.endDate = end.toISOString();
    sub.totalDays += days;
  }
}

