import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private darkModeKey = 'mealmate_dark_mode';
  isDarkMode = false;

  constructor() {
    const saved = localStorage.getItem(this.darkModeKey);
    this.isDarkMode = saved === 'true';
    this.applyTheme();
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem(this.darkModeKey, String(this.isDarkMode));
    this.applyTheme();
    return this.isDarkMode;
  }

  private applyTheme() {
    if (this.isDarkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }
}
