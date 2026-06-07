import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ManageRotationPageRoutingModule } from './manage-rotation-routing.module';

import { ManageRotationPage } from './manage-rotation.page';
import { SharedComponentsModule } from '../../components/shared-components.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ManageRotationPageRoutingModule,
    SharedComponentsModule
  ],
  declarations: [ManageRotationPage]
})
export class ManageRotationPageModule {}
