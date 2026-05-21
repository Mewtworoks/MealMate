import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  
  // Routes where the bottom tab bar should be visible
  tabRoutes = [
    '/customer-home', '/my-orders', '/wallet', '/ai-concierge', '/profile',
    '/agent-home', '/manage-menu', '/agent-earnings'
  ];

  constructor(public router: Router) {}

  showTabs(): boolean {
    const currentUrl = this.router.url.split('?')[0]; // Ignore query params
    return this.tabRoutes.some(route => currentUrl.includes(route));
  }

  getRole(): string | null {
    return localStorage.getItem('mealmate_role');
  }
}

