import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { SubscriptionModalComponent } from './subscription-modal/subscription-modal.component';
import { PageLoaderComponent } from './page-loader/page-loader.component';
import { CartPillComponent } from './cart-pill/cart-pill.component';

@NgModule({
  imports: [
    CommonModule,
    IonicModule
  ],
  declarations: [SubscriptionModalComponent, PageLoaderComponent, CartPillComponent],
  exports: [SubscriptionModalComponent, PageLoaderComponent, CartPillComponent]
})
export class SharedComponentsModule {}