import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { CustomMealPageRoutingModule } from './custom-meal-routing.module';

import { CustomMealPage } from './custom-meal.page';
import { SharedComponentsModule } from '../../components/shared-components.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CustomMealPageRoutingModule,
    SharedComponentsModule,
  ],
  declarations: [CustomMealPage]
})
export class CustomMealPageModule {}
