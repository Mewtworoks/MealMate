import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AllMealsPage } from './all-meals.page';

const routes: Routes = [
  {
    path: '',
    component: AllMealsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AllMealsPageRoutingModule {}
