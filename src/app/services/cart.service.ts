import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Meal } from './meal.service';
import { WalletService } from './wallet.service';

export interface CartItem {
  meal: Meal;
  quantity: number;
  total: number;
  discountedTotal: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItems: CartItem[] = [];
  private cartSubject = new BehaviorSubject<CartItem[]>([]);
  public cart$ = this.cartSubject.asObservable();

  constructor(private wallet: WalletService) { }

  addToCart(meal: Meal) {
    const existing = this.cartItems.find(item => item.meal.id === meal.id);
    const discountedPrice = this.wallet.getDiscountedPrice(meal.price);

    if (existing) {
      existing.quantity++;
      existing.total = existing.quantity * meal.price;
      existing.discountedTotal = existing.quantity * discountedPrice;
    } else {
      this.cartItems.push({
        meal,
        quantity: 1,
        total: meal.price,
        discountedTotal: discountedPrice
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
        this.cartItems[index].discountedTotal = this.cartItems[index].quantity * this.wallet.getDiscountedPrice(this.cartItems[index].meal.price);
      } else {
        this.cartItems.splice(index, 1);
      }
      this.cartSubject.next([...this.cartItems]);
    }
  }

  getCartTotal(): number {
    return this.cartItems.reduce((sum, item) => sum + item.total, 0);
  }

  getDiscountedCartTotal(): number {
    return this.cartItems.reduce((sum, item) => sum + item.discountedTotal, 0);
  }

  getCreditsSaved(): number {
    return this.getCartTotal() - this.getDiscountedCartTotal();
  }

  clearCart() {
    this.cartItems = [];
    this.cartSubject.next([]);
  }
}
