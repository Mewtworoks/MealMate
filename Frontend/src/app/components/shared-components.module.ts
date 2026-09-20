import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { SubscriptionModalComponent } from './subscription-modal/subscription-modal.component';
import { PageLoaderComponent } from './page-loader/page-loader.component';
import { CartPillComponent } from './cart-pill/cart-pill.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { PageHeaderComponent } from './page-header/page-header.component';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    SidebarComponent,
    PageHeaderComponent
  ],
  declarations: [SubscriptionModalComponent, PageLoaderComponent, CartPillComponent],
  exports: [SubscriptionModalComponent, PageLoaderComponent, CartPillComponent, SidebarComponent, PageHeaderComponent]
})
export class SharedComponentsModule {}