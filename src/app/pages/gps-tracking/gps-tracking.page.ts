import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, ToastController } from '@ionic/angular';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-gps-tracking',
  templateUrl: './gps-tracking.page.html',
  styleUrls: ['./gps-tracking.page.scss'],
  standalone: false
})
export class GpsTrackingPage implements OnInit, OnDestroy {
  orderId = '';
  deliveryProgress = 0.2;
  eta = 15;
  distanceRemaining = '2.4 km';
  arrived = false;
  delivered = false;

  partner = {
    name: 'Santosh Kumar',
    rating: 4.8,
    phone: '+91 98765 43210'
  };

  // Simulated route points (percentage positions on the map visual)
  agentX = 15;
  agentY = 70;

  private timer: any;

  constructor(
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private orderService: OrderService
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['orderId']) {
        this.orderId = params['orderId'];
      }
    });
    this.startSimulation();
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  startSimulation() {
    this.timer = setInterval(() => {
      if (this.arrived || this.delivered) return;

      if (this.deliveryProgress < 0.95) {
        this.deliveryProgress += 0.15;
        this.eta = Math.max(1, this.eta - 3);

        const dist = parseFloat(this.distanceRemaining.split(' ')[0]);
        this.distanceRemaining = Math.max(0.1, dist - 0.4).toFixed(1) + ' km';

        // Move agent closer to destination (bottom-right → center)
        this.agentX = Math.min(48, this.agentX + 7);
        this.agentY = Math.max(48, this.agentY - 5);
      } else {
        // Agent has arrived
        this.arrived = true;
        this.eta = 0;
        this.distanceRemaining = 'Arrived';
        this.agentX = 50;
        this.agentY = 48;
        clearInterval(this.timer);
      }
    }, 5000); // Every 5 seconds
  }

  async pickupOrder() {
    this.delivered = true;

    if (this.orderId) {
      this.orderService.updateOrderStatus(this.orderId, 'Delivered');
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
