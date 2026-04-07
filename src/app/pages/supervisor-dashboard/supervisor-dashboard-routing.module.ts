import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SupervisorDashboardPage } from './supervisor-dashboard.page';

const routes: Routes = [
  {
    path: '',
    component: SupervisorDashboardPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SupervisorDashboardPageRoutingModule {}
