import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ManageMenuPageRoutingModule } from './manage-menu-routing.module';

import { ManageMenuPage } from './manage-menu.page';
import { SharedComponentsModule } from '../../components/shared-components.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ManageMenuPageRoutingModule,
    SharedComponentsModule,
  ],
  declarations: [ManageMenuPage]
})
export class ManageMenuPageModule {}
