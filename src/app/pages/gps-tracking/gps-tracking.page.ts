import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, ToastController } from '@ionic/angular';
import { OrderService } from '../../services/order.service';
import { TrackingService, Location } from '../../services/tracking.service';
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';
import * as L from 'leaflet';

@Component({
  selector: 'app-gps-tracking',
  templateUrl: './gps-tracking.page.html',
  styleUrls: ['./gps-tracking.page.scss'],
  standalone: false
})
export class GpsTrackingPage implements OnInit, OnDestroy, AfterViewInit {
  orderId = '';
  deliveryProgress = 0.2;
  eta = 15;
  distanceRemaining = '2.4 km';
  arrived = false;
  delivered = false;
  totalTripDistance = 2; // default value

  partner = {
    name: 'Santosh Kumar',
    rating: 4.8,
    phone: '+91 98765 43210'
  };

  private map: L.Map | undefined;
private agentMarker: L.Marker | undefined;
  private customerMarker: L.Marker | undefined;
  private routeLine: L.Polyline | undefined;

  constructor(
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private orderService: OrderService,
    private trackingService: TrackingService
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['orderId']) {
        this.orderId = params['orderId'];
      }
    });
  }

  ngAfterViewInit() {
    this.initMap();
  }
  
  ionViewDidEnter() {
    // Crucial for Leaflet in Ionic/Angular to fix tile loading issues
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 500);
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  initMap() {
    // Start with customer location
    const customerPos = this.trackingService.customerLocation;
    
    // Add a slight delay to ensure container sizing is finalized
    setTimeout(() => {
      this.map = L.map('map', {
        zoomControl: false,
        attributionControl: false
      }).setView([customerPos.lat, customerPos.lng], 15);

      const layer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      });
      
      if (this.map) {
        layer.addTo(this.map);
      }

      // Final size correction
      setTimeout(() => {
        if (this.map) this.map.invalidateSize();
      }, 300);
    }, 100);

    // Custom Icons
    const agentIcon = L.divIcon({
      className: 'custom-agent-icon',
      html: `<div class="marker-pin"><i class="bike-icon">🏍️</i></div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 40]
    });

    const customerIcon = L.divIcon({
      className: 'custom-customer-icon',
      html: `<div class="customer-pin">🏠</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30]
    });

    // Add Customer Marker
    if (this.map) {
      this.customerMarker = L.marker([customerPos.lat, customerPos.lng], { icon: customerIcon })
        .addTo(this.map)
        .bindPopup('Your Location')
        .openPopup();
    }

    if (this.orderId) {
      firebase.database()
        .ref(`tracking/${this.orderId}`)
        .on('value', (snapshot: any) => {
          const loc = snapshot.val();
          if (loc) {
            this.updateAgentPosition({ lat: loc.lat, lng: loc.lng, timestamp: loc.timestamp || Date.now() });
          }
        });
    }
  }

  updateAgentPosition(loc: Location) {
    if (!this.map) return;

    if (!this.agentMarker) {
      const agentIcon = L.divIcon({
        className: 'custom-agent-icon',
        html: `<div class="marker-pulse"></div><div class="marker-inner">🏍️</div>`,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });
      this.agentMarker = L.marker([loc.lat, loc.lng], { icon: agentIcon }).addTo(this.map!);
    } else {
      this.agentMarker.setLatLng([loc.lat, loc.lng]);
    }

    // Update Route Line
    const customerPos = this.trackingService.customerLocation;
    const points: L.LatLngExpression[] = [
      [loc.lat, loc.lng],
      [customerPos.lat, customerPos.lng]
    ];

    if (this.routeLine) {
      this.routeLine.setLatLngs(points);
    } else {
      this.routeLine = L.polyline(points, {
        color: '#FF7235',
        weight: 3,
        dashArray: '5, 10',
        opacity: 0.6
      }).addTo(this.map!);
    }

    // Update Distance and ETA
    const dist = this.trackingService.getDistance(
      loc.lat, loc.lng,
      customerPos.lat, customerPos.lng
    );

    if (!this.routeLine) {
       this.totalTripDistance = dist;
    }

    this.distanceRemaining = dist.toFixed(1) + ' km';
    this.eta = Math.ceil(dist * 5); // Rough estimate: 5 min per km
    this.deliveryProgress = Math.min(0.95, 1 - (dist / this.totalTripDistance));

    if (dist < 0.05) { // Within 50 meters
      this.arrived = true;
      this.eta = 0;
      this.distanceRemaining = 'Arrived';
    }

    // Softly fit bounds if marker moves out of view
    // this.map.panTo([loc.lat, loc.lng]);
  }

  async pickupOrder() {
    this.delivered = true;

    if (this.orderId) {
      this.orderService.updateOrderStatus(this.orderId, 'Delivered');
      firebase.database().ref(`tracking/${this.orderId}`).off();
      firebase.database().ref(`tracking/${this.orderId}`).remove();
    }

    const toast = await this.toastCtrl.create({
      message: 'Order picked up! Enjoy your meal 🍽️',
      duration: 3000,
      position: 'bottom',
      color: 'success'
    });
    toast.present();

    setTimeout(() => {
      this.navCtrl.back();
    }, 2000);
  }

  goBack() {
    this.navCtrl.back();
  }
}

