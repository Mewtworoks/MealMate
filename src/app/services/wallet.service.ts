import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface WalletInfo {
  walletBalance: number;
  creditLimit: number;
  creditUsed: number;
  loyaltyPoints: number;
  availableCredit: number;
  monthlySettlementAmount: number;
}

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  // --- State ---
  private _balance = 5000;
  private _creditLimit = 500;
  private _creditUsed = 0;
  private _credits = 1000; // loyaltyPoints
  private _loaded = false;

  // --- Observables ---
  private balanceSubject = new BehaviorSubject<number>(this._balance);
  private creditLimitSubject = new BehaviorSubject<number>(this._creditLimit);
  private creditUsedSubject = new BehaviorSubject<number>(this._creditUsed);
  private creditsSubject = new BehaviorSubject<number>(this._credits);

  public balance$ = this.balanceSubject.asObservable();
  public creditLimit$ = this.creditLimitSubject.asObservable();
  public creditUsed$ = this.creditUsedSubject.asObservable();
  public credits$ = this.creditsSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ======================================================================
  // Getters
  // ======================================================================
  get balance(): number { return this._balance; }
  get credits(): number { return this._credits; }
  get creditLimit(): number { return this._creditLimit; }
  get creditUsed(): number { return this._creditUsed; }
  get availableCredit(): number { return this._creditLimit - this._creditUsed; }
  get isLoaded(): boolean { return this._loaded; }

  // ======================================================================
  // Load wallet from backend API
  // ======================================================================
  async loadWallet(userId: string): Promise<WalletInfo | null> {
    try {
      const res: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/wallet/${userId}`)
      );

      this._balance = res.WalletBalance ?? res.walletBalance ?? this._balance;
      this._creditLimit = res.CreditLimit ?? res.creditLimit ?? this._creditLimit;
      this._creditUsed = res.CreditUsed ?? res.creditUsed ?? this._creditUsed;
      this._credits = res.LoyaltyPoints ?? res.loyaltyPoints ?? this._credits;
      this._loaded = true;

      this.emitAll();

      return {
        walletBalance: this._balance,
        creditLimit: this._creditLimit,
        creditUsed: this._creditUsed,
        loyaltyPoints: this._credits,
        availableCredit: this.availableCredit,
        monthlySettlementAmount: this._creditUsed
      };
    } catch (e) {
      console.warn('WalletService: Could not load wallet from API, using local defaults.', e);
      return null;
    }
  }

  // ======================================================================
  // Step 1 & 2: Deduct balance on order (local state update)
  // The actual backend deduction happens in OrderService.PlaceOrderAsync.
  // This syncs the local state after backend confirms.
  // ======================================================================
  deductBalance(cartTotal: number, redeemPoints: boolean = false): {
    success: boolean;
    message: string;
    walletDeducted: number;
    creditUsedAmount: number;
    pointsRedeemed: number;
    pointsEarned: number;
  } {
    let remainingToPay = cartTotal;
    let pointsRedeemed = 0;
    let walletDeducted = 0;
    let creditUsedAmount = 0;

    // Step 4 — Redeem loyalty points first (max 10% of cart)
    if (redeemPoints && this._credits > 0) {
      const maxRedeem = Math.min(this._credits, Math.floor(cartTotal * 0.1));
      remainingToPay -= maxRedeem;
      this._credits -= maxRedeem;
      pointsRedeemed = maxRedeem;
    }

    // Step 1 — Deduct from wallet balance
    walletDeducted = Math.min(this._balance, remainingToPay);
    this._balance -= walletDeducted;
    remainingToPay -= walletDeducted;

    // Step 2 — Cover deficit from credit limit
    if (remainingToPay > 0) {
      if (this._creditUsed + remainingToPay <= this._creditLimit) {
        this._creditUsed += remainingToPay;
        creditUsedAmount = remainingToPay;
        remainingToPay = 0;
      } else {
        // Rollback
        this._balance += walletDeducted;
        this._credits += pointsRedeemed;
        this.emitAll();
        return {
          success: false,
          message: `Insufficient balance + credit. You need ₹${remainingToPay.toFixed(0)} more.`,
          walletDeducted: 0,
          creditUsedAmount: 0,
          pointsRedeemed: 0,
          pointsEarned: 0
        };
      }
    }

    // Step 3 — Earn loyalty points (1 pt per ₹10 spent)
    const pointsEarned = Math.floor(cartTotal / 10);
    this._credits += pointsEarned;

    this.emitAll();

    let message = 'Payment successful!';
    if (creditUsedAmount > 0) {
      message = `₹${creditUsedAmount.toFixed(0)} covered by your credit limit.`;
    }

    return {
      success: true,
      message,
      walletDeducted,
      creditUsedAmount,
      pointsRedeemed,
      pointsEarned
    };
  }

  // ======================================================================
  // Sync wallet state after successful backend order
  // ======================================================================
  syncAfterOrder(orderResponse: any) {
    // Reload wallet from the response or re-fetch
    if (orderResponse) {
      const earned = orderResponse.PointsEarned ?? orderResponse.pointsEarned ?? 0;
      const redeemed = orderResponse.PointsRedeemed ?? orderResponse.pointsRedeemed ?? 0;
      const walletAmt = orderResponse.WalletAmount ?? orderResponse.walletAmount ?? 0;
      const creditAmt = orderResponse.CreditUsedAmount ?? orderResponse.creditUsedAmount ?? 0;

      // The backend has already computed final values. Adjust local state.
      this._balance -= walletAmt;
      this._creditUsed += creditAmt;
      this._credits = this._credits - redeemed + earned;

      // Ensure non-negative
      if (this._balance < 0) this._balance = 0;

      this.emitAll();
    }
  }

  // ======================================================================
  // Calculate max redeemable points at checkout
  // ======================================================================
  getMaxRedeemable(cartTotal: number): number {
    return Math.min(this._credits, Math.floor(cartTotal * 0.1));
  }

  // ======================================================================
  // Get discounted price after points redemption
  // ======================================================================
  getDiscountedPrice(price: number): number {
    return price; // No automatic discount — redemption is explicit now
  }

  // ======================================================================
  // Check if balance + credit is enough for an order
  // ======================================================================
  canAfford(cartTotal: number, redeemPoints: boolean = false): boolean {
    let toPay = cartTotal;
    if (redeemPoints && this._credits > 0) {
      toPay -= Math.min(this._credits, Math.floor(cartTotal * 0.1));
    }
    return toPay <= (this._balance + this.availableCredit);
  }

  // ======================================================================
  // Top-up wallet via backend
  // ======================================================================
  async topUp(userId: string, amount: number): Promise<boolean> {
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/wallet/${userId}/topup`, { amount })
      );
      if (res.success || res.Success) {
        this._balance = res.NewBalance ?? res.newBalance ?? this._balance + amount;
        this.emitAll();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Top-up failed', e);
      return false;
    }
  }

  // ======================================================================
  // Month-end credit settlement
  // ======================================================================
  async settleCredit(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/wallet/${userId}/settle`, {})
      );
      if (res.success || res.Success) {
        this._balance = res.NewBalance ?? res.newBalance ?? this._balance;
        this._creditUsed = res.CreditUsed ?? res.creditUsed ?? 0;
        this.emitAll();
        return {
          success: true,
          message: res.message || res.Message || 'Credit settled successfully.'
        };
      }
      return { success: false, message: 'Settlement failed.' };
    } catch (e: any) {
      console.error('Settlement failed', e);
      return {
        success: false,
        message: e?.error || 'No outstanding credit to settle.'
      };
    }
  }

  // ======================================================================
  // Legacy compatibility — simple add/use methods
  // ======================================================================
  addBalance(amount: number) {
    this._balance += amount;
    this.emitAll();
  }

  useBalance(amount: number): boolean {
    if (this._balance >= amount) {
      this._balance -= amount;
      this.emitAll();
      return true;
    }
    return false;
  }

  useCredits(amount: number): boolean {
    if (this._credits >= amount) {
      this._credits -= amount;
      this.emitAll();
      return true;
    }
    return false;
  }

  addCredits(amount: number) {
    this._credits += amount;
    this.emitAll();
  }

  // ======================================================================
  // Internal helpers
  // ======================================================================
  private emitAll() {
    this.balanceSubject.next(this._balance);
    this.creditLimitSubject.next(this._creditLimit);
    this.creditUsedSubject.next(this._creditUsed);
    this.creditsSubject.next(this._credits);
  }
}
