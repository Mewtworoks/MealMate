import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AgentDashboardPageRoutingModule } from './agent-dashboard-routing.module';

import { AgentDashboardPage } from './agent-dashboard.page';
import { SharedComponentsModule } from '../../components/shared-components.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AgentDashboardPageRoutingModule,
    SharedComponentsModule,
  ],
  declarations: [AgentDashboardPage]
})
export class AgentDashboardPageModule {}
