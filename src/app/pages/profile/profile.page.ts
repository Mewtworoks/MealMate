import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController, AlertController } from '@ionic/angular';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false
})
export class ProfilePage implements OnInit {
  userRole: 'agent' | 'customer' = 'customer';
  userProfile: any = {
    name: 'Alex Johnson',
    email: 'alex.j@mealmate.com',
    avatar: '🙋‍♂️',
    credits: 450,
    orders: 12
  };

  // Modal State Flags
  isEditModalOpen = false;
  isNotifModalOpen = false;
  isHelpModalOpen = false;

  // Edit Temp Object
  editData = { name: '', email: '' };

  // Notification Settings
  notifications = {
    orders: true,
    promos: false,
    updates: true
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.userRole = params['role'] || 'customer';
      this.setupProfile();
    });
  }

  setupProfile() {
    if (this.userRole === 'agent') {
      this.userProfile = {
        name: "Usha's Kitchen",
        email: 'usha.chef@mealmate.com',
        avatar: '👩‍🍳',
        rating: 4.8,
        earnings: '₹12,450',
        ordersCompleted: 156
      };
    } else {
      this.userProfile = {
        name: 'Alex Johnson',
        email: 'alex.j@mealmate.com',
        avatar: '🙋‍♂️',
        credits: 450,
        orders: 12,
        loyaltyLevel: 'Silver Member'
      };
    }
  }

  // --- Actions ---

  openEditProfile() {
    this.editData = { ...this.userProfile };
    this.isEditModalOpen = true;
  }

  async saveProfile() {
    this.userProfile.name = this.editData.name;
    this.userProfile.email = this.editData.email;
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
      message: 'Biometric login and end-to-end encryption are enabled. Manage your password in the next update!',
      buttons: ['OK'],
      cssClass: 'premium-alert'
    });
    await alert.present();
  }

  async showAbout() {
    const alert = await this.alertCtrl.create({
      header: 'About MealMate',
      message: 'MealMate v2.4.0\nBridging the gap between home chefs and foodies.\n\nDeveloped with ❤️ by the Antigravity Team.',
      buttons: ['Close'],
      cssClass: 'premium-alert'
    });
    await alert.present();
  }

  logout() {
    this.router.navigate(['/login']);
  }

  goBack() {
    if (this.userRole === 'agent') {
      this.router.navigate(['/agent-home']);
    } else {
      this.router.navigate(['/customer-home']);
    }
  }
}
