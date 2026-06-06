import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';
import { OrderService, Order } from '../../services/order.service';

@Component({
  selector: 'app-order-details',
  templateUrl: './order-details.page.html',
  styleUrls: ['./order-details.page.scss'],
  standalone: false
})
export class OrderDetailsPage implements OnInit {
  order: Order | undefined;
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private orderService: OrderService
  ) { }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.order = await this.orderService.getOrderById(id);
    }
    this.isLoading = false;
  }

  goBack() {
    this.navCtrl.back();
  }

  reorder() {
    // Add items to cart or navigate to shop
    console.log('Reorder clicked');
  }

  // Calculate timeline status
  isStatusReached(status: string): boolean {
    if (!this.order) return false;
    const statuses = ['Pending', 'Accepted', 'Preparing', 'OutForDelivery', 'Delivered'];
    const currentIndex = statuses.indexOf(this.order.status);
    const checkIndex = statuses.indexOf(status);
    return currentIndex >= checkIndex && checkIndex !== -1;
  }

  // Get item image
  getItemImage(index: number): string {
    const images = [
      'assets/onboarding/dal_makhani.png',
      'assets/onboarding/paneer_tikka.png',
      'assets/onboarding/veg_pulao.png',
      'assets/onboarding/healthy_salad.png',
      'assets/onboarding/dal_chawal.png'
    ];
    return images[index % images.length];
  }
}
