import { Component, OnInit } from '@angular/core';
import { CartService, CartItem } from '../../services/cart.service';
import { WalletService } from '../../services/wallet.service';
import { OrderService, Order } from '../../services/order.service';
import { Router } from '@angular/router';
import { NavController, ToastController, AlertController, ModalController } from '@ionic/angular';
import { SubscriptionModalComponent } from '../../components/subscription-modal/subscription-modal.component';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.page.html',
  styleUrls: ['./cart.page.scss'],
  standalone: false
})
export class CartPage implements OnInit {
  items: CartItem[] = [];
  subTotal = 0;
  discount = 0;
  deliveryFee = 35;
  total = 0;
  walletBalance = 0;
  credits = 0;
  paymentType: 'wallet' | 'cod' | 'monthly' = 'wallet';

  constructor(
    public cartService: CartService,
    private wallet: WalletService,
    private orderService: OrderService,
    private router: Router,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController
  ) { }

  ngOnInit() {
    this.cartService.cart$.subscribe(items => {
      this.items = items;
      this.calculateBill();
    });

    this.wallet.balance$.subscribe(b => this.walletBalance = b);
    this.wallet.credits$.subscribe(c => this.credits = c);
  }

  calculateBill() {
    this.subTotal = this.cartService.getCartTotal();
    this.discount = this.cartService.getCreditsSaved();
    this.total = this.subTotal - this.discount + (this.items.length > 0 ? this.deliveryFee : 0);
  }

  increaseQty(item: CartItem) {
    this.cartService.addToCart(item.meal);
  }

  decreaseQty(item: CartItem) {
    this.cartService.removeFromCart(item.meal.id);
  }

  getMonthlyPrice(): number {
    // 20% off on 30 days of the current order
    return Math.round(this.subTotal * 30 * 0.8);
  }

  async openSubscriptionModal() {
    const modal = await this.modalCtrl.create({
      component: SubscriptionModalComponent,
      breakpoints: [0, 0.9],
      initialBreakpoint: 0.9,
      cssClass: 'premium-modal'
    });
    return await modal.present();
  }

  getSubscriptionDiscount(): number {
    return Math.round(this.subTotal * 0.2);
  }

  getFinalTotal(): number {
    if (this.paymentType === 'monthly') {
      // First month payment: item total minus 20% discount, free delivery
      return Math.round(this.subTotal * 0.8) - this.discount;
    }
    return this.total;
  }

  getPaymentLabel(): string {
    switch (this.paymentType) {
      case 'wallet': return 'VIA WALLET';
      case 'cod': return 'CASH ON DELIVERY';
      case 'monthly': return 'MONTHLY PLAN';
    }
  }

  async placeOrder() {
    const finalTotal = this.getFinalTotal();

    if (this.paymentType === 'wallet' && finalTotal > this.walletBalance) {
      const alert = await this.alertCtrl.create({
        header: 'Insufficient Balance',
        message: 'Your wallet balance is low. Please top up or choose another payment method.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    // Process Payment based on type
    if (this.paymentType === 'wallet') {
      if (this.discount > 0) {
        this.wallet.useCredits(this.discount);
      }
      this.wallet.useBalance(finalTotal);
    }

    const newOrder: Order = {
      id: 'ORD-' + Math.floor(Math.random() * 8999 + 1000),
      date: new Date().toISOString(),
      total: finalTotal,
      items: [...this.items],
      status: 'Pending',
      creditUsed: this.discount,
      amountDue: this.paymentType === 'cod' ? finalTotal : 0,
      agentId: this.items[0]?.meal.agentId,
      deliveryTime: '30-40 mins',
      subscriptionId: this.paymentType === 'monthly' ? 'SUB-' + Math.floor(Math.random() * 8999 + 1000) : undefined
    };

    this.orderService.addOrder(newOrder);
    this.cartService.clearCart();

    let message = '';
    switch (this.paymentType) {
      case 'wallet': message = 'Paid via wallet! Order placed 🎉'; break;
      case 'cod': message = 'Order placed! Pay ₹' + finalTotal + ' on delivery 💵'; break;
      case 'monthly': message = 'Subscribed! Your daily tiffin starts tomorrow 🗓️'; break;
    }

    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color: 'success'
    });
    toast.present();

    this.router.navigate(['/my-orders']);
  }

  goBack() {
    this.navCtrl.back();
  }
}
