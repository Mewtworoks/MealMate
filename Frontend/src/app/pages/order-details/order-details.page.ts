import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';
import { OrderService, Order } from '../../services/order.service';
import { MealService } from '../../services/meal.service';

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
    private orderService: OrderService,
    private mealService: MealService
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

  // Get item image dynamically
  getItemImage(index: number, item?: any): string {
    if (item) {
      const name = item.name || item.mealName || item.MealName || '';
      const img = item.imageUrl || item.ImageUrl || '';
      return this.mealService.mapMealImage(img, name);
    }
    if (this.order && this.order.items && this.order.items.length > index) {
      const it = this.order.items[index];
      const name = it.name || it.mealName || it.MealName || '';
      const img = it.imageUrl || it.ImageUrl || '';
      return this.mealService.mapMealImage(img, name);
    }
    return this.orderService.getMealFallbackImage(index);
  }

  rateMeal(mealId?: string) {
    if (mealId) {
      this.navCtrl.navigateForward(['/meal-detail', mealId]);
    } else if (this.order && this.order.items && this.order.items.length > 0) {
      const firstItem = this.order.items[0];
      const mId = firstItem.mealId || firstItem.id || '1';
      this.navCtrl.navigateForward(['/meal-detail', mId]);
    } else {
      this.navCtrl.navigateForward(['/meal-detail', '1']);
    }
  }
}
