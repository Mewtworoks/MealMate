import { Component, OnInit, OnDestroy } from '@angular/core';
import { CartService, CartItem } from '../../services/cart.service';
import { WalletService } from '../../services/wallet.service';
import { OrderService } from '../../services/order.service';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';
import { NavController, ToastController, AlertController, ModalController } from '@ionic/angular';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.page.html',
  styleUrls: ['./cart.page.scss'],
  standalone: false
})
export class CartPage implements OnInit, OnDestroy {
  items: CartItem[] = [];
  subTotal = 0;
  deliveryFee = 35;
  total = 0;

  // Wallet state
  walletBalance = 0;
  credits = 0;
  creditLimit = 0;
  creditUsed = 0;

  // Checkout options
  paymentType: 'wallet' | 'cod' = 'wallet';
  redeemPoints = false;
  pointsSavings = 0;

  // Order processing
  isPlacingOrder = false;

  private subs: Subscription[] = [];

  constructor(
    public cartService: CartService,
    public wallet: WalletService,
    private orderService: OrderService,
    private auth: AuthService,
    private router: Router,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) { }

  ngOnInit() {
    this.subs.push(
      this.cartService.cart$.subscribe(items => {
        this.items = items;
        this.calculateBill();
      }),
      this.wallet.balance$.subscribe(b => this.walletBalance = b),
      this.wallet.credits$.subscribe(c => this.credits = c),
      this.wallet.creditLimit$.subscribe(cl => this.creditLimit = cl),
      this.wallet.creditUsed$.subscribe(cu => this.creditUsed = cu)
    );

    // Try to load wallet from backend
    const userId = this.auth.userId;
    if (userId) {
      this.wallet.loadWallet(userId);
    }
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  calculateBill() {
    this.subTotal = this.cartService.getCartTotal();
    this.pointsSavings = this.redeemPoints ? this.wallet.getMaxRedeemable(this.subTotal) : 0;
    this.total = this.subTotal - this.pointsSavings + (this.items.length > 0 ? this.deliveryFee : 0);
  }

  toggleRedeemPoints() {
    this.redeemPoints = !this.redeemPoints;
    this.calculateBill();
  }

  getMaxRedeemable(): number {
    return this.wallet.getMaxRedeemable(this.subTotal);
  }

  increaseQty(item: CartItem) {
    this.cartService.addToCart(item.meal);
  }

  decreaseQty(item: CartItem) {
    this.cartService.removeFromCart(item.meal.id);
  }

  getFinalTotal(): number {
    return this.total;
  }

  getPaymentLabel(): string {
    switch (this.paymentType) {
      case 'wallet': return 'VIA WALLET';
      case 'cod': return 'CASH ON DELIVERY';
    }
  }

  canPlaceOrder(): boolean {
    if (this.items.length === 0) return false;
    if (this.isPlacingOrder) return false;
    if (this.paymentType === 'wallet') {
      return this.wallet.canAfford(this.total, false); // Points already subtracted from total
    }
    return true;
  }

  getDeficitAmount(): number {
    const toPay = this.total;
    const available = this.walletBalance + this.wallet.availableCredit;
    return Math.max(0, toPay - available);
  }

  needsCredit(): boolean {
    return this.paymentType === 'wallet' && this.total > this.walletBalance && this.total <= (this.walletBalance + this.wallet.availableCredit);
  }

  getCreditNeeded(): number {
    return Math.max(0, this.total - this.walletBalance);
  }

  async placeOrder() {
    if (this.isPlacingOrder) return;

    const finalTotal = this.getFinalTotal();
    const userId = this.auth.userId;

    if (!userId) {
      const toast = await this.toastCtrl.create({
        message: 'You must be logged in to place an order',
        duration: 2000,
        color: 'warning'
      });
      toast.present();
      this.router.navigate(['/login']);
      return;
    }

    // Check affordability for wallet payment
    if (this.paymentType === 'wallet' && !this.canPlaceOrder()) {
      const alert = await this.alertCtrl.create({
        header: 'Insufficient Funds',
        message: `Your wallet balance (₹${this.walletBalance}) + credit limit (₹${this.wallet.availableCredit} available) is not enough. You need ₹${this.getDeficitAmount().toFixed(0)} more.`,
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    // If credit will be used, confirm with user
    if (this.needsCredit()) {
      const creditNeeded = this.getCreditNeeded();
      const alert = await this.alertCtrl.create({
        header: 'Credit Limit Usage',
        message: `₹${creditNeeded.toFixed(0)} will be covered from your credit limit. You'll need to settle this at month-end. Continue?`,
        buttons: [
          { text: 'Cancel', role: 'cancel' },
          { text: 'Proceed', role: 'confirm' }
        ]
      });
      await alert.present();
      const result = await alert.onDidDismiss();
      if (result.role !== 'confirm') return;
    }

    this.isPlacingOrder = true;

    try {
      const orderPayload = {
        customerId: userId,
        agentId: this.items[0]?.meal.agentId || '05603423-ff0f-442c-8b8a-b306536cdb7b',
        deliveryAddress: 'Currently set to Profile Address',
        paymentMethod: this.paymentType === 'wallet' ? 'Wallet' : 'COD',
        redeemPoints: this.redeemPoints,
        items: this.items.map(i => ({
          mealId: i.meal.id,
          quantity: i.quantity
        }))
      };

      const res = await this.orderService.placeOrder(orderPayload);

      // Reload wallet from backend to get accurate state
      await this.wallet.loadWallet(userId);

      this.cartService.clearCart();

      // Build success message
      let message = 'Order placed successfully! 🎉';
      const pointsEarned = res?.PointsEarned ?? res?.pointsEarned ?? 0;
      const creditUsedAmt = res?.CreditUsedAmount ?? res?.creditUsedAmount ?? 0;

      if (pointsEarned > 0) {
        message += ` +${pointsEarned} points earned!`;
      }

      const toast = await this.toastCtrl.create({
        message,
        duration: 3000,
        position: 'bottom',
        color: 'success'
      });
      toast.present();

      // Show credit usage alert if credit was used
      if (creditUsedAmt > 0) {
        setTimeout(async () => {
          const creditAlert = await this.alertCtrl.create({
            header: 'Credit Used',
            message: `₹${creditUsedAmt.toFixed(0)} was covered by your credit limit. Remember to settle at month-end.`,
            buttons: ['Got it'],
            cssClass: 'credit-alert'
          });
          await creditAlert.present();
        }, 1000);
      }

      this.router.navigate(['/my-orders']);
    } catch (error: any) {
      const errorMsg = error?.error || error?.message || 'Could not connect to the server. Please try again.';
      const alert = await this.alertCtrl.create({
        header: 'Order Failed',
        message: typeof errorMsg === 'string' ? errorMsg : 'Something went wrong. Please try again.',
        buttons: ['OK']
      });
      await alert.present();
    } finally {
      this.isPlacingOrder = false;
    }
  }

  goBack() {
    this.navCtrl.back();
  }
}
