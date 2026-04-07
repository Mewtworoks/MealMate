import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private _balance = 2500; // Wallet balance in ₹
  private _credits = 1000; // Loyalty/Promo credits

  private balanceSubject = new BehaviorSubject<number>(this._balance);
  private creditsSubject = new BehaviorSubject<number>(this._credits);

  public balance$ = this.balanceSubject.asObservable();
  public credits$ = this.creditsSubject.asObservable();

  constructor() { }

  get balance(): number {
    return this._balance;
  }

  get credits(): number {
    return this._credits;
  }

  addBalance(amount: number) {
    this._balance += amount;
    this.balanceSubject.next(this._balance);
  }

  useBalance(amount: number): boolean {
    if (this._balance >= amount) {
      this._balance -= amount;
      this.balanceSubject.next(this._balance);
      return true;
    }
    return false;
  }

  useCredits(amount: number): boolean {
    if (this._credits >= amount) {
      this._credits -= amount;
      this.creditsSubject.next(this._credits);
      return true;
    }
    return false;
  }

  addCredits(amount: number) {
    this._credits += amount;
    this.creditsSubject.next(this._credits);
  }

  // Logic for cheaper amount using credits
  getDiscountedPrice(price: number): number {
    const discount = Math.min(price * 0.1, this._credits); // 10% max off using credits
    return price - discount;
  }
}
