import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AgentEarningsPage } from './agent-earnings.page';

const routes: Routes = [
  {
    path: '',
    component: AgentEarningsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AgentEarningsPageRoutingModule {}
