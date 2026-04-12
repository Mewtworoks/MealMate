import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, LoadingController, ToastController, NavController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit {
  viewMode: 'onboarding' | 'login' | 'signup' | 'otp' = 'onboarding';
  username = '';
  password = '';
  phone = '';
  otp = '';
  role: 'customer' | 'agent' = 'customer';

  // Carousel State
  currentMealIndex = 0;
  meals = [
    {
      name: 'Delicious Indian Food',
      description: 'Dal Makhani with Naan',
      image: 'assets/onboarding/dal_makhani.png',
      bgColor: '#FFEBD4'
    },
    {
      name: 'Authentic Paneer Tikka',
      description: 'Paneer Tikka with Naan',
      image: 'assets/onboarding/paneer_tikka.png',
      bgColor: '#FFF9C4'
    },
    {
      name: 'Flavorful Veg Pulao',
      description: 'Veg Pulao with Raita',
      image: 'assets/onboarding/veg_pulao.png',
      bgColor: '#E8F5E9'
    }
  ];

  private carouselTimer: any;

  constructor(
    private router: Router,
    private navCtrl: NavController,
    private auth: AuthService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {
    this.startCarousel();
  }

  startCarousel() {
    this.carouselTimer = setInterval(() => {
      this.nextMeal();
    }, 3000);
  }

  nextMeal() {
    this.currentMealIndex = (this.currentMealIndex + 1) % this.meals.length;
  }

  prevMeal() {
    this.currentMealIndex = (this.currentMealIndex - 1 + this.meals.length) % this.meals.length;
  }

  setMeal(index: number) {
    this.currentMealIndex = index;
    clearInterval(this.carouselTimer);
    this.startCarousel();
  }

  // Flow controls
  showLogin() { this.viewMode = 'login'; clearInterval(this.carouselTimer); }
  showSignup() { this.viewMode = 'signup'; clearInterval(this.carouselTimer); }
  showOTPView() { this.viewMode = 'otp'; }
  backToOnboarding() { this.viewMode = 'onboarding'; this.startCarousel(); }

  toggleRole() {
    this.role = this.role === 'customer' ? 'agent' : 'customer';
  }

  async login() {
    if (!this.phone || this.phone.length < 10) {
      this.showToast('Please enter a valid 10-digit mobile number', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Sending OTP...',
      spinner: 'circles'
    });
    await loading.present();

    try {
      await this.auth.requestOtp(this.phone);
      await loading.dismiss();
      
      this.showToast('OTP sent to your mobile', 'success');
      this.viewMode = 'otp'; // Switch to OTP screen
    } catch (error) {
      await loading.dismiss();
      this.showToast('Failed to send OTP. Try again.', 'danger');
    }
  }

  async verifyOTP() {
    if (!this.otp || this.otp.length < 4) {
      this.showToast('Please enter the OTP sent to you', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Verifying...',
      spinner: 'circles'
    });
    await loading.present();

    try {
      const user = await this.auth.verifyOtp(this.phone, this.otp, this.role);
      await loading.dismiss();

      const userId = user.id || user.Id;
      const userRole = (user.role || user.Role || this.role || '').toLowerCase();

      if (user && userId) {
        if (userRole === 'customer') {
          await this.router.navigateByUrl('/customer-home', { replaceUrl: true });
        } else {
          await this.router.navigateByUrl('/agent-home', { replaceUrl: true });
        }
      } else {
        this.showToast('Authentication succeeded but user data was missing.', 'warning');
      }
    } catch (error) {
      await loading.dismiss();
      this.showToast('Invalid OTP. Please check and try again.', 'danger');
    }
  }

  async showToast(message: string, color: string = 'dark') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color: color
    });
    toast.present();
  }

  ngOnDestroy() {
    if (this.carouselTimer) {
      clearInterval(this.carouselTimer);
    }
  }
}
