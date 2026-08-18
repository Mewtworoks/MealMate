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

import { ThemeService } from '../../services/theme.service';
import { ReviewService, MealReview } from '../../services/review.service';

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

  // Reviews
  chefReviews: MealReview[] = [];
  chefRating: string = '4.9';
  totalReviewCount: number = 0;

  // Kitchen location management
  kitchenName = 'Grand Central Kitchen';
  kitchenAddress = 'Connaught Place, New Delhi';
  kitchenLat = 28.6139;
  kitchenLng = 77.2090;
  kitchenRadiusKm = 20;
  isSavingLocation = false;
  isDetectingGps = false;
  hasKitchenConfigured = false;
  private ordersSubscription?: Subscription;

  get currentDelivery(): Order | null {
    return this.activeOrders.find(o => o.status === 'OutForDelivery') || this.activeOrders[0] || null;
  }

  toggleOnlineStatus() {
    this.isOnline = !this.isOnline;
  }

  constructor(
    public themeService: ThemeService,
    public reviewService: ReviewService,
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
    await this.loadChefKitchenLocation();
    this.loadChefReviews();

    if (this.ordersSubscription) {
      this.ordersSubscription.unsubscribe();
    }
    
    this.ordersSubscription = this.orderService.orders$.subscribe(allOrders => {
      this.orders = allOrders;
      this.filterOrders();
      this.calculateEarnings();
    });
  }

  loadChefReviews() {
    const agentId = this.auth.userId || '05603423-ff0f-442c-8b8a-b306536cdb7b';
    this.chefReviews = this.reviewService.getReviewsForAgent(agentId);
    this.totalReviewCount = this.chefReviews.length;
    if (this.chefReviews.length > 0) {
      const sum = this.chefReviews.reduce((acc, r) => acc + r.rating, 0);
      this.chefRating = (sum / this.chefReviews.length).toFixed(1);
    } else {
      this.chefRating = '4.9';
    }
  }

  async loadChefKitchenLocation() {
    const chefId = this.auth.userEmail || this.auth.userId;
    if (!chefId) return;
    const loc = await this.mealService.getChefLocation(chefId);
    if (loc) {
      if (loc.kitchenName) this.kitchenName = loc.kitchenName;
      if (loc.address) this.kitchenAddress = loc.address;
      if (loc.latitude) this.kitchenLat = loc.latitude;
      if (loc.longitude) this.kitchenLng = loc.longitude;
      if (loc.serviceRadiusKm) this.kitchenRadiusKm = loc.serviceRadiusKm;
      this.hasKitchenConfigured = !!loc.hasKitchen;
    }
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

      this.hasKitchenConfigured = true;

      const alert = await this.alertCtrl.create({
        header: 'Kitchen Updated',
        message: 'Your kitchen location & delivery radius have been updated successfully!',
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

  getFormattedOrderId(order: any): string {
    if (!order) return '#MM30003';
    const rawId = order.displayId || order.DisplayId || order.id || order.Id || '';
    if (!rawId) return '#MM30003';
    if (rawId.startsWith('#')) return rawId;
    if (rawId.startsWith('MM')) return `#${rawId}`;
    const num = Math.abs(rawId.replace(/-/g, '').split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0)) % 90000 + 10000;
    return `#MM${num}`;
  }

  // Dynamic Analytics Helpers
  get acceptRate(): number {
    if (!this.orders || this.orders.length === 0) return 100;
    const rejected = this.orders.filter(o => o.status === 'Rejected').length;
    return Math.round(((this.orders.length - rejected) / this.orders.length) * 100);
  }

  get avgPrepTime(): number {
    if (!this.orders || this.orders.length === 0) return 15;
    const totalItems = this.orders.reduce((sum, o) => sum + (o.items?.length || 1), 0);
    const avg = Math.round(12 + (totalItems / Math.max(1, this.orders.length)) * 3);
    return Math.min(25, Math.max(10, avg));
  }

  getDeliveryMinsAway(order: Order | null): number {
    if (!order) return 12;
    const dist = order.distanceKm || 1.5;
    return Math.max(4, Math.round(dist * 4));
  }

  getPrepTimeLeft(order: Order): string {
    if (!order) return '8 min left';
    if (order.status === 'OutForDelivery') return 'Out for delivery';
    if (order.status === 'Preparing') return 'In kitchen';
    return '8 min left';
  }
}
