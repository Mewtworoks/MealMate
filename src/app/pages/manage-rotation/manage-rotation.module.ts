import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ManageRotationPageRoutingModule } from './manage-rotation-routing.module';

import { ManageRotationPage } from './manage-rotation.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ManageRotationPageRoutingModule
  ],
  declarations: [ManageRotationPage]
})
export class ManageRotationPageModule {}
