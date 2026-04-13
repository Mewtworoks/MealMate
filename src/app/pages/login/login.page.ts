import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';

declare var google: any;
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
export class LoginPage implements OnInit, OnDestroy, AfterViewInit {
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

  ngAfterViewInit() {
    this.initializeGoogleSignIn();
  }

  initializeGoogleSignIn() {
    if (typeof google !== 'undefined') {
      google.accounts.id.initialize({
        client_id: '1024312686784-u1071q8jimqbagni96q0856n1gm16d8v.apps.googleusercontent.com', // Replace with your actual client id
        callback: (response: any) => this.handleGoogleLogin(response)
      });

      google.accounts.id.renderButton(
        document.getElementById('google-btn'),
        {
          theme: 'outline',
          size: 'large',
          width: '100%',
          shape: 'pill',
          text: 'continue_with'
        }
      );
    } else {
      // Retry after a short delay if script hasn't loaded
      setTimeout(() => this.initializeGoogleSignIn(), 1000);
    }
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
        this.showToast('Google Sign-In failed.', 'danger');
      }
    } catch (error) {
      await loading.dismiss();
      console.error('Google Login Error:', error);
      this.showToast('Authentication failed. Please try again.', 'danger');
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
