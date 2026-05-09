import { Component, OnInit, OnDestroy } from '@angular/core';
import { WalletService, WalletInfo } from '../../services/wallet.service';
import { AuthService } from '../../services/auth';
import { NavController, AlertController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-wallet',
  templateUrl: './wallet.page.html',
  styleUrls: ['./wallet.page.scss'],
  standalone: false
})
export class WalletPage implements OnInit, OnDestroy {
  walletBalance = 0;
  creditLimit = 0;
  creditUsed = 0;
  loyaltyPoints = 0;
  availableCredit = 0;
  isLoading = true;
  isSettling = false;
  greeting = 'Good morning';
  userName = 'Foodie';
  userLocation = 'Fetching location...';
  selectedTopUp = 0;
  isTopUp = false;

  private subs: Subscription[] = [];

  constructor(
    public wallet: WalletService,
    private auth: AuthService,
    private navCtrl: NavController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  async ngOnInit() {
    this.subs.push(
      this.wallet.balance$.subscribe(b => this.walletBalance = b),
      this.wallet.creditLimit$.subscribe(cl => this.creditLimit = cl),
      this.wallet.creditUsed$.subscribe(cu => {
        this.creditUsed = cu;
        this.availableCredit = this.creditLimit - cu;
      }),
      this.wallet.credits$.subscribe(c => this.loyaltyPoints = c)
    );

    this.updateGreeting();
    this.userName = this.auth.userName || 'Foodie';
    this.fetchLocation();

    const userId = this.auth.userId;
    if (userId) {
      await this.wallet.loadWallet(userId);
    }
    this.isLoading = false;
  }

  fetchLocation() {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
            const data = await res.json();
            const town = data.address.suburb || data.address.neighbourhood || data.address.town || data.address.city;
            const state = data.address.state || data.address.country;
            this.userLocation = town ? `${town}, ${state}` : 'Current Location';
          } catch (e) {
            this.userLocation = 'Location Unknown';
          }
        },
        () => {
          this.userLocation = 'Location Disabled';
        }
      );
    } else {
      this.userLocation = 'Location Unavailable';
    }
  }

  updateGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) this.greeting = 'Good morning';
    else if (hour < 17) this.greeting = 'Good afternoon';
    else this.greeting = 'Good evening';
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  getCreditUsagePercent(): number {
    if (this.creditLimit === 0) return 0;
    return Math.min(100, (this.creditUsed / this.creditLimit) * 100);
  }

  getPointsValue(): number {
    return this.loyaltyPoints; // 1 pt = ₹1
  }

  getLoyaltyTier(): string {
    if (this.loyaltyPoints >= 5000) return 'Platinum';
    if (this.loyaltyPoints >= 2000) return 'Gold';
    if (this.loyaltyPoints >= 500) return 'Silver';
    return 'Bronze';
  }

  getLoyaltyTierIcon(): string {
    if (this.loyaltyPoints >= 5000) return 'diamond';
    if (this.loyaltyPoints >= 2000) return 'trophy';
    if (this.loyaltyPoints >= 500) return 'medal';
    return 'ribbon';
  }

  getNextTierPoints(): number {
    if (this.loyaltyPoints >= 5000) return 0;
    if (this.loyaltyPoints >= 2000) return 5000 - this.loyaltyPoints;
    if (this.loyaltyPoints >= 500) return 2000 - this.loyaltyPoints;
    return 500 - this.loyaltyPoints;
  }

  getNextTierName(): string {
    if (this.loyaltyPoints >= 5000) return 'Max';
    if (this.loyaltyPoints >= 2000) return 'Platinum';
    if (this.loyaltyPoints >= 500) return 'Gold';
    return 'Silver';
  }

  getTierProgress(): number {
    if (this.loyaltyPoints >= 5000) return 100;
    if (this.loyaltyPoints >= 2000) return ((this.loyaltyPoints - 2000) / 3000) * 100;
    if (this.loyaltyPoints >= 500) return ((this.loyaltyPoints - 500) / 1500) * 100;
    return (this.loyaltyPoints / 500) * 100;
  }

  selectTopUp(amount: number) {
    this.selectedTopUp = amount;
  }

  async processTopUp() {
    if (this.selectedTopUp === 0) return;

    const userId = this.auth.userId;
    if (!userId) {
      const toast = await this.toastCtrl.create({
        message: 'Please log in first.',
        duration: 2000,
        color: 'warning'
      });
      toast.present();
      return;
    }

    this.isTopUp = true;
    const success = await this.wallet.topUp(userId, this.selectedTopUp);
    this.isTopUp = false;

    if (success) {
      const toast = await this.toastCtrl.create({
        message: `₹${this.selectedTopUp} added to your wallet! 🎉`,
        duration: 2500,
        color: 'success'
      });
      toast.present();
      this.selectedTopUp = 0;
    } else {
      const toast = await this.toastCtrl.create({
        message: 'Top-up failed. Please try again.',
        duration: 2000,
        color: 'danger'
      });
      toast.present();
    }
  }

  async settleCredit() {
    if (this.creditUsed <= 0) return;

    const userId = this.auth.userId;
    if (!userId) return;

    const alert = await this.alertCtrl.create({
      header: 'Settle Credit',
      message: `You owe ₹${this.creditUsed.toFixed(0)} this month. This will be deducted from your wallet balance (₹${this.walletBalance}). Continue?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Pay Now', role: 'confirm', handler: () => {} }
      ]
    });
    await alert.present();
    const result = await alert.onDidDismiss();

    if (result.role === 'confirm') {
      this.isSettling = true;
      const res = await this.wallet.settleCredit(userId);
      this.isSettling = false;

      const toast = await this.toastCtrl.create({
        message: res.message,
        duration: 2500,
        color: res.success ? 'success' : 'warning'
      });
      toast.present();
    }
  }

  goBack() {
    this.navCtrl.back();
  }
}
