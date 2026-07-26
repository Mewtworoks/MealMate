import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { GpsTrackingPage } from './gps-tracking.page';

const routes: Routes = [
  {
    path: '',
    component: GpsTrackingPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class GpsTrackingPageRoutingModule {}
