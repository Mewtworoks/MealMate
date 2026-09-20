import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AiInsightsPageRoutingModule } from './ai-insights-routing.module';

import { AiInsightsPage } from './ai-insights.page';
import { SharedComponentsModule } from '../../components/shared-components.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AiInsightsPageRoutingModule,
    SharedComponentsModule
  ],
  declarations: [AiInsightsPage]
})
export class AiInsightsPageModule {}
