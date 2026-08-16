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
    path: 'ai-concierge',
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
  },  {
    path: 'wallet',
    loadChildren: () => import('./pages/wallet/wallet.module').then( m => m.WalletPageModule)
  },
  {
    path: 'profile',
    loadChildren: () => import('./pages/profile/profile.module').then( m => m.ProfilePageModule)
  },
  {
    path: 'manage-menu',
    loadChildren: () => import('./pages/manage-menu/manage-menu.module').then( m => m.ManageMenuPageModule)
  },
  {
    path: 'subscribe',
    loadChildren: () => import('./pages/subscribe/subscribe.module').then( m => m.SubscribePageModule)
  },
  {
    path: 'add-meal',
    loadChildren: () => import('./pages/add-meal/add-meal.module').then( m => m.AddMealPageModule)
  },
  {
    path: 'agent-earnings',
    loadChildren: () => import('./pages/agent-earnings/agent-earnings.module').then( m => m.AgentEarningsPageModule)
  },
  {
    path: 'manage-rotation',
    loadChildren: () => import('./pages/manage-rotation/manage-rotation.module').then( m => m.ManageRotationPageModule)
  },
  {
    path: 'all-meals',
    redirectTo: 'customer-home',
    pathMatch: 'full'
  },
  {
    path: 'health',
    loadChildren: () => import('./pages/health/health.module').then( m => m.HealthPageModule)
  },
  {
    path: 'meal-detail/:id',
    loadChildren: () => import('./pages/meal-detail/meal-detail.module').then( m => m.MealDetailPageModule)
  },
  {
    path: 'order-details/:id',
    loadChildren: () => import('./pages/order-details/order-details.module').then( m => m.OrderDetailsPageModule)
  },


];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
