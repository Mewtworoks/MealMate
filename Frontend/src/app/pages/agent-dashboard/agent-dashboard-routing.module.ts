import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AgentDashboardPage } from './agent-dashboard.page';

const routes: Routes = [
  {
    path: '',
    component: AgentDashboardPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AgentDashboardPageRoutingModule {}
