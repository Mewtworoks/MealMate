import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private _userRole: 'customer' | 'agent' | null = null;
  private _isAuthenticated = false;
  private _userId: string | null = null;

  constructor(private http: HttpClient) {}

  async loginWithEmail(email: string, password: string, role: 'customer' | 'agent'): Promise<any> {
    const payload = { email, password, role };
    const res: any = await firstValueFrom(
      this.http.post(`${environment.apiUrl}/auth/login`, payload)
    );

    if (res.success && res.user) {
      this.saveUserSession(res.user, role);
      return res.user;
    }
    return res;
  }

  async register(fullName: string, email: string, password: string, phoneNumber: string, role: 'customer' | 'agent'): Promise<any> {
    const payload = { fullName, email, password, phoneNumber, role };
    const res: any = await firstValueFrom(
      this.http.post(`${environment.apiUrl}/auth/register`, payload)
    );

    if (res.success && res.user) {
      this.saveUserSession(res.user, role);
      return res.user;
    }
    return res;
  }

  private saveUserSession(userData: any, role: 'customer' | 'agent') {
    const userId = userData.id || userData.Id;
    this._userId = userId;
    this._userRole = role;
    this._isAuthenticated = true;

    localStorage.setItem('mealmate_user_id', userId);
    localStorage.setItem('mealmate_role', role);

    const email = userData.email || userData.Email || 'user@mealmate.com';
    localStorage.setItem('mealmate_useremail', email);

    const name = userData.fullName || userData.FullName || email.split('@')[0];
    localStorage.setItem('mealmate_username', name);
  }

  async loginWithGoogle(idToken: string, role: 'customer' | 'agent'): Promise<any> {
    const payload = {
      idToken,
      role: role.charAt(0).toUpperCase() + role.slice(1)
    };

    const res: any = await firstValueFrom(
      this.http.post(`${environment.apiUrl}/auth/google-login`, payload)
    );

    const userData = res.user;
    if (res.success && userData) {
      this.saveUserSession(userData, role);
      return res.user;
    }

    return res;
  }

  get userId(): string | null {
    return this._userId || localStorage.getItem('mealmate_user_id');
  }

  get userName(): string | null {
    const name = localStorage.getItem('mealmate_username');
    if (!name || name === 'null' || name === 'undefined') return null;
    return name;
  }

  get userEmail(): string | null {
    const email = localStorage.getItem('mealmate_useremail');
    if (!email || email === 'null' || email === 'undefined') return null;
    return email;
  }

  setSession(role: 'customer' | 'agent') {
    this._userRole = role;
    this._isAuthenticated = true;
    localStorage.setItem('mealmate_role', role);
  }

  get userRole() {
    return this._userRole || localStorage.getItem('mealmate_role') as 'customer' | 'agent';
  }

  get isAuthenticated() {
    return this._isAuthenticated || !!localStorage.getItem('mealmate_role');
  }

  get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    else if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  logout() {
    this._userRole = null;
    this._isAuthenticated = false;
    this._userId = null;
    localStorage.removeItem('mealmate_role');
    localStorage.removeItem('mealmate_user_id');
    localStorage.removeItem('mealmate_username');
    localStorage.removeItem('mealmate_useremail');

    // Force Native Google Logout to clear session and show account picker next time
    const win = (window as any);
    if (win.plugins && win.plugins.googleplus) {
      win.plugins.googleplus.logout(
        (msg: any) => console.log('Native Google Logout Success'),
        (err: any) => console.error('Native Google Logout Error:', err)
      );
    }
  }
}
