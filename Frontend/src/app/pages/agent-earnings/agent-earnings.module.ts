import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AgentEarningsPageRoutingModule } from './agent-earnings-routing.module';

import { AgentEarningsPage } from './agent-earnings.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AgentEarningsPageRoutingModule
  ],
  declarations: [AgentEarningsPage]
})
export class AgentEarningsPageModule {}
