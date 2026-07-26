import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CustomMealPage } from './custom-meal.page';

const routes: Routes = [
  {
    path: '',
    component: CustomMealPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CustomMealPageRoutingModule {}
