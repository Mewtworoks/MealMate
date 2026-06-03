import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MealDetailPage } from './meal-detail.page';

const routes: Routes = [
  {
    path: '',
    component: MealDetailPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MealDetailPageRoutingModule {}
