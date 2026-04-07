import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: 'customer-home',
    loadChildren: () => import('./pages/shop/shop.module').then( m => m.ShopPageModule)
  },
  {
    path: 'agent-home',
    loadChildren: () => import('./pages/agent-dashboard/agent-dashboard.module').then( m => m.AgentDashboardPageModule)
  },
  {
    path: 'live-tracking',
    loadChildren: () => import('./pages/gps-tracking/gps-tracking.module').then( m => m.GpsTrackingPageModule)
  },
  {
    path: 'ai-meal-picks',
    loadChildren: () => import('./pages/ai-insights/ai-insights.module').then( m => m.AiInsightsPageModule)
  },
  {
    path: 'my-orders',
    loadChildren: () => import('./pages/my-orders/my-orders.module').then( m => m.MyOrdersPageModule)
  },
  {
    path: 'supervisor-dashboard',
    loadChildren: () => import('./pages/supervisor-dashboard/supervisor-dashboard.module').then( m => m.SupervisorDashboardPageModule)
  },
  {
    path: 'custom-meal',
    loadChildren: () => import('./pages/custom-meal/custom-meal.module').then( m => m.CustomMealPageModule)
  },
  {
    path: 'cart',
    loadChildren: () => import('./pages/cart/cart.module').then( m => m.CartPageModule)
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
