import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, AlertController, ToastController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { OrderService, Order } from '../../services/order.service';
import { MealService, Meal } from '../../services/meal.service';
import { TrackingService } from '../../services/tracking.service';
import { GpsService } from '../../services/gps.service';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { Subscription, firstValueFrom, timeout, catchError, of } from 'rxjs';
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';

@Component({
  selector: 'app-agent-dashboard',
  templateUrl: './agent-dashboard.page.html',
  styleUrls: ['./agent-dashboard.page.scss'],
  standalone: false
})
export class AgentDashboardPage implements OnInit {
  orders: Order[] = [];
  pendingOrders: Order[] = [];
  activeOrders: Order[] = [];
  completedOrders: Order[] = [];
  activeSegment = 'requests';
  earnings = 0;
  isProfileModalOpen = false;
  isLocationModalOpen = false;
  isOnline = true;
  chefName = '';
  greeting = '';

  // Kitchen location management
  kitchenName = 'Grand Central Kitchen';
  kitchenAddress = 'Connaught Place, New Delhi';
  kitchenLat = 28.6139;
  kitchenLng = 77.2090;
  kitchenRadiusKm = 20;
  isSavingLocation = false;
  isDetectingGps = false;
  private ordersSubscription?: Subscription;

  get currentDelivery(): Order | null {
    return this.activeOrders.find(o => o.status === 'OutForDelivery') || this.activeOrders[0] || null;
  }

  toggleOnlineStatus() {
    this.isOnline = !this.isOnline;
  }

  constructor(
    private orderService: OrderService,
    private mealService: MealService,
    private trackingService: TrackingService,
    private gpsService: GpsService,
    private auth: AuthService,
    private router: Router,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private http: HttpClient
  ) { }

  async ionViewWillEnter() {
    this.chefName = this.auth.userName || 'Chef';
    this.greeting = this.auth.greeting;
    const agentId = this.auth.userId;
    if (agentId) {
      await this.orderService.refreshAgentOrders(agentId);
    }

    if (this.ordersSubscription) {
      this.ordersSubscription.unsubscribe();
    }
    
    this.ordersSubscription = this.orderService.orders$.subscribe(allOrders => {
      this.orders = allOrders;
      this.filterOrders();
      this.calculateEarnings();
    });
  }

  ngOnInit() {}

  async logout() {
    this.isProfileModalOpen = false;
    await this.auth.logout();
    this.trackingService.stopAgentTracking();
    const lastLoc = this.gpsService.lastLocation || { latitude: 0, longitude: 0 };
    this.gpsService.stopTracking(lastLoc.latitude, lastLoc.longitude);
    this.router.navigate(['/login']);
  }

  openLocationModal() {
    this.isLocationModalOpen = true;
  }

  closeLocationModal() {
    this.isLocationModalOpen = false;
  }

  useCurrentGpsLocation() {
    if (!navigator.geolocation) {
      this.showToast('Geolocation is not supported by your browser.', 'warning');
      return;
    }

    this.isDetectingGps = true;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const rawLat = pos.coords.latitude;
        const rawLng = pos.coords.longitude;

        // Round to 6 decimal places (standard high-precision geo coordinates)
        this.kitchenLat = Math.round(rawLat * 1000000) / 1000000;
        this.kitchenLng = Math.round(rawLng * 1000000) / 1000000;

        // Auto-fetch reverse geocoded human-readable address
        await this.fetchAddressFromCoords(this.kitchenLat, this.kitchenLng);
        this.isDetectingGps = false;
        this.showToast('Kitchen GPS coordinates & address auto-fetched!', 'success');
      },
      (err) => {
        console.warn('GPS Error:', err);
        this.isDetectingGps = false;
        this.showToast('Could not retrieve GPS location. Please check location permissions.', 'warning');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  async fetchAddressFromCoords(lat: number, lng: number) {
    try {
      const res: any = await firstValueFrom(
        this.http.get(`https://nominatim.openstreetmap.org/reverse?format=json&accept-language=en&lat=${lat}&lon=${lng}`).pipe(
          timeout(5000),
          catchError(() => of(null))
        )
      );

      if (res && res.address) {
        const addr = res.address;
        const subLocality = addr.road || addr.suburb || addr.neighbourhood || addr.residential || '';
        const district = addr.subdistrict || addr.county || addr.city_district || addr.state_district || '';
        const city = addr.city || addr.town || addr.village || addr.municipality || '';
        const state = addr.state || '';

        const components = [subLocality, district, city, state]
          .map(c => c ? c.trim() : '')
          .filter(c => c && c.length > 0 && !/[^\x00-\x7F]/.test(c)); // Filter out any non-English/non-ASCII characters

        if (components.length > 0) {
          // Remove duplicate consecutive parts
          this.kitchenAddress = Array.from(new Set(components)).join(', ');
          return;
        }
      }

      if (res && res.display_name) {
        // Fallback: Filter non-ASCII tokens from display_name
        const parts = res.display_name.split(', ')
          .filter((p: string) => !/[^\x00-\x7F]/.test(p));
        this.kitchenAddress = parts.slice(0, 4).join(', ');
      }
    } catch (e) {
      console.warn('Reverse geocoding note:', e);
    }
  }

  async showToast(message: string, color: string = 'dark') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color
    });
    toast.present();
  }

  async saveKitchenLocation() {
    const chefId = this.auth.userEmail || this.auth.userId;
    if (!chefId) return;

    this.isSavingLocation = true;
    try {
      await this.mealService.updateChefLocation(
        chefId,
        this.kitchenLat,
        this.kitchenLng,
        this.kitchenAddress,
        this.kitchenName,
        this.kitchenRadiusKm
      );

      const alert = await this.alertCtrl.create({
        header: 'Location Updated',
        message: 'Your kitchen location & 20 km delivery radius have been saved successfully!',
        buttons: ['OK']
      });
      await alert.present();
      this.isLocationModalOpen = false;
    } catch (e) {
      console.error('Error saving kitchen location:', e);
    } finally {
      this.isSavingLocation = false;
    }
  }

  filterOrders() {
    this.pendingOrders = this.orders.filter(o => o.status === 'Pending');
    this.activeOrders = this.orders.filter(o => ['Accepted', 'Preparing', 'OutForDelivery'].includes(o.status));
    this.completedOrders = this.orders.filter(o => o.status === 'Delivered');
  }

  calculateEarnings() {
    this.earnings = this.completedOrders.reduce((sum, o) => sum + o.total, 0);
  }

  async updateOrderStatus(orderId: string, newStatus: any) {
    const agentId = this.auth.userId;
    await this.orderService.updateOrderStatus(orderId, newStatus);

    // Trigger tracking if needed
    if (newStatus === 'OutForDelivery') {
      this.trackingService.startAgentTracking(); // keep old one for UI compat if needed
      this.gpsService.activeOrderId = orderId;
      this.gpsService.startTracking(agentId || '');
    } else if (newStatus === 'Delivered') {
      this.trackingService.stopAgentTracking();
      const lastLoc = this.gpsService.lastLocation || { latitude: 0, longitude: 0 };
      this.gpsService.stopTracking(lastLoc.latitude, lastLoc.longitude);
      firebase.database().ref(`tracking/${orderId}`).remove();
    }

    if (agentId) {
      await this.orderService.refreshAgentOrders(agentId);
    }
  }

  acceptOrder(orderId: string) {
    this.updateOrderStatus(orderId, 'Accepted');
  }

  rejectOrder(orderId: string) {
    this.updateOrderStatus(orderId, 'Rejected');
  }

  getStatusColor(status: string): string {
    return this.orderService.getStatusColor(status);
  }

  // Analytics Helpers
  get todaysEarnings(): number {
    return 0;
  }
}
