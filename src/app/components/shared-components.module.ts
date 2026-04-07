import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { SubscriptionModalComponent } from './subscription-modal/subscription-modal.component';

@NgModule({
  imports: [
    CommonModule,
    IonicModule
  ],
  declarations: [SubscriptionModalComponent],
  exports: [SubscriptionModalComponent]
})
export class SharedComponentsModule {}