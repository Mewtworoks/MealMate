import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ManageMenuPage } from './manage-menu.page';

const routes: Routes = [
  {
    path: '',
    component: ManageMenuPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ManageMenuPageRoutingModule {}
