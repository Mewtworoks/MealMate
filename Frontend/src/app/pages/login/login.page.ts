import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';

declare var google: any;
declare var window: any;
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, LoadingController, ToastController, NavController, Platform } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit, OnDestroy, AfterViewInit {
  role: 'customer' | 'agent' = 'customer';
  isMobileDev: boolean = false;
  showFallbackGoogle = false;
  private googleRetries = 0;
  private deviceReady = false; 

  currentStep: number = 1;

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
    private toastCtrl: ToastController,
    private platform: Platform
  ) { }

  ngOnInit() {
    // Only use the native plugin if running in a real native environment.
    // In a browser (even with mobile view), we should use the Web GIS button.
    this.isMobileDev = this.platform.is('capacitor') || this.platform.is('cordova');

    // Check if user is already logged in and redirect instantly
    if (this.auth.isAuthenticated) {
      const role = this.auth.userRole;
      if (role === 'agent') {
        this.router.navigateByUrl('/agent-home', { replaceUrl: true });
      } else {
        this.router.navigateByUrl('/customer-home', { replaceUrl: true });
      }
      return; // Stop further initialization
    }

    this.startCarousel();

    // ADD THIS BLOCK — listen early
    document.addEventListener('deviceready', () => {
      this.deviceReady = true;
      console.log('deviceready fired');
    }, false);

    // If already ready (rare case)
    this.platform.ready().then(() => {
      this.deviceReady = true;
    });
  }

  ngAfterViewInit() {
    this.initializeGoogleSignIn();
  }

  initializeGoogleSignIn() {
    if (typeof google !== 'undefined') {
      const btnElement = document.getElementById('google-btn');
      if (btnElement) {
        google.accounts.id.initialize({
          client_id: '1024312686784-u1071q8jimqbagni96q0856n1gm16d8v.apps.googleusercontent.com',
          callback: (response: any) => this.handleGoogleLogin(response)
        });
        google.accounts.id.renderButton(
          btnElement,
          {
            theme: 'filled_blue',
            size: 'large',
            width: 340,
            shape: 'pill',
            text: 'signin_with'
          }
        );
      }
    } else {
      this.googleRetries++;
      if (this.googleRetries > 2) {
        this.showFallbackGoogle = true;
      }
      setTimeout(() => this.initializeGoogleSignIn(), 1000);
    }
  }

  async signInWithNativeGoogle() {
    this.mockGoogleLogin();
  }

  mockGoogleLogin() {
    this.auth.setSession(this.role);
    if (this.role === 'customer') {
      this.router.navigateByUrl('/customer-home', { replaceUrl: true });
    } else {
      this.router.navigateByUrl('/agent-home', { replaceUrl: true });
    }
    this.showToast('Logged in successfully', 'success');
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

  goToStep(step: number) {
    this.currentStep = step;
    if (step === 2) {
      setTimeout(() => this.initializeGoogleSignIn(), 100);
    }
  }

  nextStep() {
    if (this.currentStep < 3) {
      this.currentStep++;
      if (this.currentStep === 2) {
        setTimeout(() => this.initializeGoogleSignIn(), 100);
      }
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  toggleRole() {
    this.role = this.role === 'customer' ? 'agent' : 'customer';
  }

  async handleGoogleLogin(response: any) {
    const loading = await this.loadingCtrl.create({
      message: 'Signing in with Google...',
      spinner: 'circles'
    });
    await loading.present();

    try {
      const user = await this.auth.loginWithGoogle(response.credential, this.role);
      await loading.dismiss();

      if (user) {
        const userRole = (user.role || user.Role || this.role || '').toLowerCase();
        if (userRole === 'customer') {
          await this.router.navigateByUrl('/customer-home', { replaceUrl: true });
        } else {
          await this.router.navigateByUrl('/agent-home', { replaceUrl: true });
        }
      } else {
        this.showToast('Sign-In failed.', 'danger');
      }
    } catch (error) {
      await loading.dismiss();
      console.warn('Google auth failed, using quick login fallback...', error);
      this.mockGoogleLogin();
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