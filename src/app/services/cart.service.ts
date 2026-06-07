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
        this.cartItems = JSON.parse(localCart);
        this.cartSubject.next([...this.cartItems]);
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
          // Map backend cart dto to frontend CartItem interface
          // Note: Assuming backend returns { meal: {...}, quantity, total } 
          // because we use .Include(c => c.Meal) in the API
          if (remoteCart.length > 0 && remoteCart[0].meal) {
             this.cartItems = remoteCart as CartItem[];
             this.cartSubject.next([...this.cartItems]);
             this.saveToLocal(); // Sync local with remote
          }
        }
      } catch (err) {
        // API not available yet, silently fallback to local storage
        console.log('Cart API not available, using local storage fallback.');
      }
    }
  }

  addToCart(meal: Meal) {
    const existing = this.cartItems.find(item => item.meal.id === meal.id);

    if (existing) {
      existing.quantity++;
      existing.total = existing.quantity * meal.price;
    } else {
      this.cartItems.push({
        meal,
        quantity: 1,
        total: meal.price
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
        item.total = item.quantity * item.meal.price;
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
          mealImage: item.meal.image,
          mealName: item.meal.name
        });
      }
    }
  }

  getCartTotal(): number {
    return this.cartItems.reduce((sum, item) => sum + item.total, 0);
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
