import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ManageRotationPage } from './manage-rotation.page';

const routes: Routes = [
  {
    path: '',
    component: ManageRotationPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ManageRotationPageRoutingModule {}
