import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController, AlertController } from '@ionic/angular';
import { AuthService } from '../../services/auth';
import { ThemeService } from '../../services/theme.service';
import { MealService } from '../../services/meal.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false
})
export class ProfilePage implements OnInit {
  userRole: 'agent' | 'customer' = 'customer';
  userProfile: any = {
    name: 'MealMate_User',
    email: 'abcd@gmail.com',
    phone: '+91 98••• ••210',
    avatar: '🙋‍♂️',
    credits: 3180,
    orders: 151,
    lifetimeSpend: '₹28,450',
    loyaltyPoints: 1132,
    loyaltyLevel: 'Silver member',
    memberSince: 'Aug 2024'
  };

  referralCode = 'MEAL200';

  // Modal State Flags
  isEditModalOpen = false;
  isNotifModalOpen = false;
  isHelpModalOpen = false;

  // Edit Temp Object
  editData = { name: '', email: '', phone: '' };

  // Notification Settings
  notifications = {
    orders: true,
    promos: true,
    updates: false
  };

  isOnline = true;
  isLoadingProfile = false;

  // Dynamic Chef KPIs — bound to template
  chefKpis = {
    ordersServed: 0,
    acceptRate: 96,
    avgPrepTime: '18 min',
    deliveryRadiusKm: 6,
    rating: 4.8,
    ratingsCount: 0,
    totalEarnings: 0,
    availableBalance: 0,
    menuCount: 0,
    outOfStockCount: 0,
    cuisines: ['North Indian', 'Home style'] as string[],
    memberSince: '',
    isVerified: true,
    fssaiNumber: '22821004000371',
    kitchenHours: {
      breakfast: { label: 'Not serving yet', isOpen: false },
      lunch: { label: '11:30 AM – 3:00 PM', isOpen: true },
      dinner: { label: '7:00 PM – 10:30 PM', isOpen: true },
      weeklyOff: { label: 'Every Tuesday', isOpen: false }
    },
    compliance: {
      fssaiStatus: 'Verified',
      fssaiExpiry: 'Mar 2027',
      gstStatus: 'Active',
      bankName: 'HDFC Bank',
      bankAccount: 'HDFC •••• 4821'
    }
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private auth: AuthService,
    public themeService: ThemeService,
    private mealService: MealService
  ) { }

  toggleOnlineStatus() {
    this.isOnline = !this.isOnline;
  }

  switchToCustomerMode() {
    localStorage.setItem('mealmate_role', 'customer');
    this.userRole = 'customer';
    this.router.navigate(['/customer-home']);
  }

  get isDarkMode(): boolean {
    return this.themeService.isDarkMode;
  }

  get userInitials(): string {
    if (this.userProfile?.name) {
      const parts = this.userProfile.name.trim().split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return this.userProfile.name.substring(0, 2).toUpperCase();
    }
    return this.auth.userInitials;
  }

  toggleDarkMode() {
    this.themeService.toggleTheme();
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.userRole = params['role'] || (this.themeService.isAgent ? 'agent' : 'customer');
      this.setupProfile();
    });
  }

  setupProfile() {
    const authName = this.auth.userName;
    const authEmail = this.auth.userEmail;

    if (this.userRole === 'agent') {
      this.userProfile = {
        name: authName || "Usha's Kitchen",
        email: authEmail || 'usha.chef@mealmate.com',
        phone: '+91 98••• ••210',
        avatar: '👩‍🍳',
        rating: 4.8,
        earnings: '₹12,450',
        ordersCompleted: 156,
        credits: 12450,
        orders: 156,
        lifetimeSpend: '₹1,45,800',
        loyaltyPoints: 3420,
        loyaltyLevel: 'Gold Partner',
        memberSince: 'Jan 2024'
      };
      // Fetch dynamic chef profile from backend
      this.loadChefProfile();
    } else {
      this.userProfile = {
        name: authName || 'MealMate_User',
        email: authEmail || 'abcd@gmail.com',
        phone: '+91 98••• ••210',
        avatar: '🙋‍♂️',
        credits: 3180,
        orders: 151,
        lifetimeSpend: '₹28,450',
        loyaltyPoints: 1132,
        loyaltyLevel: 'Silver member',
        memberSince: 'Aug 2024'
      };
    }
  }

  async loadChefProfile() {
    const chefId = this.auth.userId || this.auth.userEmail || '';
    if (!chefId) return;

    this.isLoadingProfile = true;
    try {
      const profile = await this.mealService.getChefProfile(chefId);
      if (profile) {
        // Update user profile from API
        this.userProfile.name = profile.kitchenName || this.userProfile.name;
        this.userProfile.email = profile.email || this.userProfile.email;
        if (profile.phone) this.userProfile.phone = profile.phone;

        // Update KPIs
        this.chefKpis = {
          ordersServed: profile.ordersServed ?? this.chefKpis.ordersServed,
          acceptRate: profile.acceptRate ?? this.chefKpis.acceptRate,
          avgPrepTime: profile.avgPrepTime || this.chefKpis.avgPrepTime,
          deliveryRadiusKm: profile.deliveryRadiusKm ?? this.chefKpis.deliveryRadiusKm,
          rating: profile.rating ?? this.chefKpis.rating,
          ratingsCount: profile.ratingsCount ?? this.chefKpis.ratingsCount,
          totalEarnings: profile.totalEarnings ?? this.chefKpis.totalEarnings,
          availableBalance: profile.availableBalance ?? this.chefKpis.availableBalance,
          menuCount: profile.menuCount ?? this.chefKpis.menuCount,
          outOfStockCount: profile.outOfStockCount ?? this.chefKpis.outOfStockCount,
          cuisines: (profile.cuisines && profile.cuisines.length > 0) ? profile.cuisines : this.chefKpis.cuisines,
          memberSince: profile.memberSince || this.chefKpis.memberSince,
          isVerified: profile.isVerified ?? true,
          fssaiNumber: profile.fssaiNumber || this.chefKpis.fssaiNumber,
          kitchenHours: profile.kitchenHours || this.chefKpis.kitchenHours,
          compliance: profile.compliance || this.chefKpis.compliance
        };
      }
    } catch (e) {
      console.warn('Chef profile load failed, using defaults', e);
    } finally {
      this.isLoadingProfile = false;
    }
  }

  // --- Navigation Helpers ---

  navigateToWallet() {
    this.router.navigate(['/wallet']);
  }

  navigateToHealth() {
    this.router.navigate(['/health']);
  }

  navigateToAddresses() {
    this.showAddressToast();
  }

  async showAddressToast() {
    const toast = await this.toastCtrl.create({
      message: 'Delivery Addresses: Kalkaji (Default), Hauz Khas, Saket',
      duration: 2500,
      position: 'top',
      mode: 'ios'
    });
    toast.present();
  }

  async copyReferralCode() {
    navigator.clipboard?.writeText(this.referralCode);
    const toast = await this.toastCtrl.create({
      message: 'Referral code MEAL200 copied to clipboard!',
      duration: 2000,
      color: 'success',
      position: 'top',
      mode: 'ios'
    });
    toast.present();
  }

  async shareInvite() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'MealMate Invite',
          text: 'Use my code MEAL200 to get ₹200 wallet credit on MealMate!',
          url: window.location.origin
        });
      } catch (e) { }
    } else {
      this.copyReferralCode();
    }
  }

  async downloadData() {
    const toast = await this.toastCtrl.create({
      message: 'Preparing your account data dump. Check your email shortly!',
      duration: 2500,
      color: 'dark',
      position: 'top',
      mode: 'ios'
    });
    toast.present();
  }

  // --- Actions ---

  openEditProfile() {
    this.editData = {
      name: this.userProfile.name,
      email: this.userProfile.email,
      phone: this.userProfile.phone || '+91 98••• ••210'
    };
    this.isEditModalOpen = true;
  }

  async saveProfile() {
    this.userProfile.name = this.editData.name;
    this.userProfile.email = this.editData.email;
    this.userProfile.phone = this.editData.phone;
    this.isEditModalOpen = false;

    const toast = await this.toastCtrl.create({
      message: 'Profile updated successfully!',
      duration: 2000,
      color: 'success',
      position: 'top',
      mode: 'ios'
    });
    toast.present();
  }

  async showSecurity() {
    const alert = await this.alertCtrl.create({
      header: 'Security & Privacy',
      message: 'Biometric login and end-to-end encryption are enabled. Manage your password and active sessions.',
      buttons: ['OK'],
      cssClass: 'premium-alert'
    });
    await alert.present();
  }

  async showAbout() {
    const alert = await this.alertCtrl.create({
      header: 'About MealMate',
      message: 'MealMate v2.4.0\nBridging home-cooked meals with smart daily delivery.\n\nDeveloped with ❤️ by Nikunj.',
      buttons: ['Close'],
      cssClass: 'premium-alert'
    });
    await alert.present();
  }

  async logout() {
    await this.auth.logout();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  goBack() {
    if (this.userRole === 'agent') {
      this.router.navigate(['/agent-home']);
    } else {
      this.router.navigate(['/customer-home']);
    }
  }
}
