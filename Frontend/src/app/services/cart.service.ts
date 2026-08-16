import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subject, firstValueFrom } from 'rxjs';
import { Meal } from './meal.service';
import { AuthService } from './auth';
import { environment } from '../../environments/environment';

export interface CartItem {
  meal: Meal;
  quantity: number;
  total: number;
}

/** Emitted when an item is added or the last unit is removed */
export interface CartEvent {
  type: 'add' | 'remove-last';
  mealImage: string;
  mealName: string;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItems: CartItem[] = [];
  private cartSubject = new BehaviorSubject<CartItem[]>([]);
  public cart$ = this.cartSubject.asObservable();

  /** Stream of cart events for animations */
  private cartEventSubject = new Subject<CartEvent>();
  public cartEvent$ = this.cartEventSubject.asObservable();

  private storageKey = 'mealmate_cart';

  constructor(private http: HttpClient, private authService: AuthService) { 
    this.loadCart();
  }

  async loadCart() {
    // 1. First load from local storage for instant UI rendering
    const localCart = localStorage.getItem(this.storageKey);
    if (localCart) {
      try {
        const rawItems = JSON.parse(localCart);
        if (Array.isArray(rawItems)) {
          this.cartItems = rawItems.map((item: any) => {
            const meal = item.meal || {};
            const mealPrice = Number(meal.price || meal.Price || 0);
            const quantity = Number(item.quantity || item.Quantity || 1);
            const total = Number(item.total || item.Total || (quantity * mealPrice));
            return {
              meal: {
                ...meal,
                id: meal.id || meal.Id || item.mealId || item.MealId,
                name: meal.name || meal.Name || 'Meal',
                price: isNaN(mealPrice) ? 0 : mealPrice,
                image: meal.image || meal.Image || 'assets/onboarding/dal_makhani.png'
              },
              quantity: isNaN(quantity) ? 1 : quantity,
              total: isNaN(total) ? (quantity * mealPrice) : total
            };
          });
          this.cartSubject.next([...this.cartItems]);
        }
      } catch (e) {
        console.error('Error parsing local cart', e);
      }
    }

    // 2. Try fetching from remote API if user is logged in
    const userId = this.authService.userId;
    if (userId) {
      try {
        const remoteCart: any = await firstValueFrom(
          this.http.get(`${environment.apiUrl}/Cart/${userId}`)
        );
        if (remoteCart && Array.isArray(remoteCart)) {
          if (remoteCart.length > 0) {
            this.cartItems = remoteCart.map((item: any) => {
              const meal = item.meal || item.Meal || {};
              const mealPrice = Number(meal.price || meal.Price || 0);
              const quantity = Number(item.quantity || item.Quantity || 1);
              const total = Number(item.total || item.Total || (quantity * mealPrice));
              return {
                meal: {
                  ...meal,
                  id: meal.id || meal.Id || item.mealId || item.MealId,
                  name: meal.name || meal.Name || 'Meal',
                  price: isNaN(mealPrice) ? 0 : mealPrice,
                  image: meal.image || meal.Image || 'assets/onboarding/dal_makhani.png'
                },
                quantity: isNaN(quantity) ? 1 : quantity,
                total: isNaN(total) ? (quantity * mealPrice) : total
              };
            });
            this.cartSubject.next([...this.cartItems]);
            this.saveToLocal(); // Sync local with remote
          }
        }
      } catch (err) {
        console.log('Cart API not available, using local storage fallback.');
      }
    }
  }

  addToCart(meal: Meal) {
    const mealPrice = Number(meal.price || 0);
    const existing = this.cartItems.find(item => item.meal.id === meal.id);

    if (existing) {
      existing.quantity = (Number(existing.quantity) || 0) + 1;
      existing.meal.price = mealPrice;
      existing.total = existing.quantity * mealPrice;
    } else {
      this.cartItems.push({
        meal: { ...meal, price: mealPrice },
        quantity: 1,
        total: mealPrice
      });
    }
    this.cartSubject.next([...this.cartItems]);

    this.saveToLocal();
    this.syncWithBackend();

    // Emit animation event
    this.cartEventSubject.next({
      type: 'add',
      mealImage: meal.image,
      mealName: meal.name
    });
  }

  removeFromCart(mealId: string) {
    const index = this.cartItems.findIndex(item => item.meal.id === mealId);
    if (index > -1) {
      const item = this.cartItems[index];
      const isLastUnit = item.quantity === 1;

      if (item.quantity > 1) {
        item.quantity--;
        const mealPrice = Number(item.meal?.price || 0);
        item.total = item.quantity * mealPrice;
      } else {
        this.cartItems.splice(index, 1);
      }
      this.cartSubject.next([...this.cartItems]);

      this.saveToLocal();
      this.syncWithBackend();

      // Emit burst animation only when the last unit of a meal is removed
      if (isLastUnit) {
        this.cartEventSubject.next({
          type: 'remove-last',
          mealImage: item.meal?.image || '',
          mealName: item.meal?.name || ''
        });
      }
    }
  }

  getCartTotal(): number {
    return this.cartItems.reduce((sum, item) => {
      const mealPrice = Number(item.meal?.price || 0);
      const qty = Number(item.quantity || 1);
      const itemTotal = Number(item.total);
      const validTotal = (!isNaN(itemTotal) && itemTotal > 0) ? itemTotal : (qty * mealPrice);
      return sum + (isNaN(validTotal) ? 0 : validTotal);
    }, 0);
  }

  getItemCount(): number {
    return this.cartItems.length;
  }

  getQuantity(mealId: string): number {
    const item = this.cartItems.find(i => i.meal.id === mealId);
    return item ? item.quantity : 0;
  }

  clearCart() {
    this.cartItems = [];
    this.cartSubject.next([]);
    this.saveToLocal();
    
    const userId = this.authService.userId;
    if (userId) {
      this.http.delete(`${environment.apiUrl}/Cart/${userId}`).subscribe({
        error: () => console.log('Cart API clear failed, fallback used.')
      });
    }
  }

  private saveToLocal() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.cartItems));
  }

  private async syncWithBackend() {
    const userId = this.authService.userId;
    if (!userId) return;

    const cartDto = this.cartItems.map(item => ({
      MealId: item.meal.id,
      Quantity: item.quantity,
      Total: item.total
    }));

    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/Cart/${userId}/sync`, cartDto)
      );
    } catch (err) {
      // Backend not ready yet, fails gracefully
    }
  }
}
