import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';

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

  constructor(private router: Router) { }

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

  login() {
    console.log('Login attempt:', {
      role: this.role,
      mode: this.viewMode,
      username: this.username,
      phone: this.phone
    });
    
    // Role-based routing for MealMate
    if (this.role === 'customer') {
      this.router.navigate(['/customer-home']);
    } else {
      this.router.navigate(['/agent-home']);
    }
  }

  verifyOTP() {
    console.log('Verifying OTP:', this.otp);
    this.login();
  }

  ngOnDestroy() {
    if (this.carouselTimer) {
      clearInterval(this.carouselTimer);
    }
  }
}
