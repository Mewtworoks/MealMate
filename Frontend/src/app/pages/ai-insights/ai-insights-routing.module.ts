import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AiInsightsPage } from './ai-insights.page';

const routes: Routes = [
  {
    path: '',
    component: AiInsightsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AiInsightsPageRoutingModule {}
