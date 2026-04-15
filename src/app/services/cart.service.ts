import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Meal } from './meal.service';

export interface CartItem {
  meal: Meal;
  quantity: number;
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItems: CartItem[] = [];
  private cartSubject = new BehaviorSubject<CartItem[]>([]);
  public cart$ = this.cartSubject.asObservable();

  constructor() { }

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
  }

  removeFromCart(mealId: string) {
    const index = this.cartItems.findIndex(item => item.meal.id === mealId);
    if (index > -1) {
      if (this.cartItems[index].quantity > 1) {
        this.cartItems[index].quantity--;
        this.cartItems[index].total = this.cartItems[index].quantity * this.cartItems[index].meal.price;
      } else {
        this.cartItems.splice(index, 1);
      }
      this.cartSubject.next([...this.cartItems]);
    }
  }

  getCartTotal(): number {
    return this.cartItems.reduce((sum, item) => sum + item.total, 0);
  }

  getItemCount(): number {
    return this.cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  clearCart() {
    this.cartItems = [];
    this.cartSubject.next([]);
  }
}
