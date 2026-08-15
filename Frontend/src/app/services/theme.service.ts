import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private darkModeKey = 'mealmate_dark_mode';
  private sidebarCollapsedKey = 'mealmate_sidebar_collapsed';

  isDarkMode = false;
  isSidebarCollapsed = false;

  get userRole(): 'customer' | 'agent' {
    const role = localStorage.getItem('mealmate_role');
    if (role === 'chef' || role === 'agent') return 'agent';
    return 'customer';
  }

  get isAgent(): boolean {
    return this.userRole === 'agent';
  }

  constructor() {
    const savedDark = localStorage.getItem(this.darkModeKey);
    this.isDarkMode = savedDark === 'true';
    this.applyTheme();

    const savedSidebar = localStorage.getItem(this.sidebarCollapsedKey);
    this.isSidebarCollapsed = savedSidebar === 'true';
    this.applySidebarState();
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem(this.darkModeKey, String(this.isDarkMode));
    this.applyTheme();
    return this.isDarkMode;
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    localStorage.setItem(this.sidebarCollapsedKey, String(this.isSidebarCollapsed));
    this.applySidebarState();
    return this.isSidebarCollapsed;
  }

  private applyTheme() {
    if (this.isDarkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }

  private applySidebarState() {
    if (this.isSidebarCollapsed) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
  }
}
