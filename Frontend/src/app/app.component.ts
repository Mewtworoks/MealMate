import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { ThemeService } from './services/theme.service';
import { PageLoaderService } from './services/page-loader.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  
  // Routes where the bottom tab bar should be visible
  tabRoutes = [
    '/customer-home', '/my-orders', '/health', '/ai-concierge', '/profile', '/custom-meal', '/subscribe', '/wallet',
    '/agent-home', '/manage-menu', '/agent-earnings', '/manage-rotation'
  ];

  /** When true a page loader is active — hide the tab bar */
  pageLoading = false;

  constructor(
    public router: Router,
    public themeService: ThemeService,
    private pageLoaderService: PageLoaderService
  ) {
    this.pageLoaderService.loading$.subscribe(v => this.pageLoading = v);
  }

  showTabs(): boolean {
    if (this.pageLoading) return false;
    const currentUrl = this.router.url.split('?')[0]; // Ignore query params
    return this.tabRoutes.some(route => currentUrl.includes(route));
  }

  getRole(): string | null {
    return this.themeService.userRole;
  }
}

