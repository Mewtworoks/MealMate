import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ManageMenuPageRoutingModule } from './manage-menu-routing.module';

import { ManageMenuPage } from './manage-menu.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ManageMenuPageRoutingModule
  ],
  declarations: [ManageMenuPage]
})
export class ManageMenuPageModule {}
