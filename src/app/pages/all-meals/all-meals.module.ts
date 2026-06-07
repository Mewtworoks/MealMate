import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AllMealsPageRoutingModule } from './all-meals-routing.module';

import { AllMealsPage } from './all-meals.page';
import { SharedComponentsModule } from '../../components/shared-components.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AllMealsPageRoutingModule,
    SharedComponentsModule
  ],
  declarations: [AllMealsPage]
})
export class AllMealsPageModule {}

