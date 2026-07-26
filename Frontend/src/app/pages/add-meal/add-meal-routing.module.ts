import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AddMealPage } from './add-meal.page';

const routes: Routes = [
  {
    path: '',
    component: AddMealPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AddMealPageRoutingModule {}
