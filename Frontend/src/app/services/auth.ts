import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';

import { ClerkAuthService } from './clerk-auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private _userRole: 'customer' | 'agent' | null = null;
  private _isAuthenticated = false;
  private _userId: string | null = null;

  constructor(private http: HttpClient, private clerkAuth: ClerkAuthService) {}

  async loginWithEmail(email: string, password: string, role: 'customer' | 'agent'): Promise<any> {
    const key = environment.clerkPublishableKey;
    if (key && key.startsWith('pk_test_') && !key.includes('clean-mudfish-62')) {
      try {
        const clerkRes = await this.clerkAuth.signInWithEmailAndPassword(email, password);

        if (clerkRes.success && clerkRes.user) {
          const u = clerkRes.user;
          const userEmail = u.primaryEmailAddress?.emailAddress || email;
          const userFullName = u.fullName || [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || userEmail.split('@')[0];
          const userData = {
            id: u.id,
            email: userEmail,
            fullName: userFullName
          };
          this.saveUserSession(userData, role);
          return userData;
        } else if (clerkRes.notFound) {
          return { success: false, message: 'Account not found. Please click "Sign Up" to create an account!' };
        } else if (clerkRes.message) {
          return { success: false, message: clerkRes.message };
        }
      } catch (clerkErr: any) {
        console.warn('Clerk auth note:', clerkErr?.message || clerkErr);
      }
    }

    const payload = { email, password, role };
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/auth/login`, payload).pipe(
          timeout(8000),
          catchError(() => of({ success: false, message: 'Server connection timeout.' }))
        )
      );

      if (res.success && res.user) {
        this.saveUserSession(res.user, role);
        return res.user;
      }

      return res;
    } catch (err: any) {
      console.warn('Backend login note:', err);
      return { success: false, message: 'Invalid email or password. Please check your credentials.' };
    }
  }

  async register(fullName: string, email: string, password: string, phoneNumber: string, role: 'customer' | 'agent'): Promise<any> {
    const key = environment.clerkPublishableKey;
    if (key && key.startsWith('pk_test_') && !key.includes('clean-mudfish-62')) {
      try {
        const clerkRes = await this.clerkAuth.signUpWithEmailAndPassword(email, password, fullName);

        if (clerkRes.success && clerkRes.user) {
          const u = clerkRes.user;
          const userEmail = u.primaryEmailAddress?.emailAddress || email;
          const userFullName = fullName || u.fullName || [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || userEmail.split('@')[0];
          const userData = {
            id: u.id,
            email: userEmail,
            fullName: userFullName
          };
          this.saveUserSession(userData, role);
          return userData;
        } else if (clerkRes.exists) {
          return { success: false, message: 'An account already exists with this email. Please click "Sign In"!' };
        } else if (clerkRes.message) {
          return { success: false, message: clerkRes.message };
        }
      } catch (clerkErr: any) {
        console.warn('Clerk register note:', clerkErr?.message || clerkErr);
      }
    }

    const payload = { fullName, email, password, phoneNumber, role };
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/auth/register`, payload).pipe(
          timeout(8000),
          catchError(() => of({ success: false, message: 'Server connection timeout.' }))
        )
      );

      if (res.success && res.user) {
        this.saveUserSession(res.user, role);
        return res.user;
      }

      return res;
    } catch (err: any) {
      console.warn('Backend register note:', err);
      return { success: false, message: 'Account creation failed. Please try again.' };
    }
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

    // Extract best human-readable full name
    let name = userData.fullName || userData.FullName;
    if (!name || name === 'null' || name === 'undefined' || name.startsWith('user_')) {
      name = email.split('@')[0];
    }
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
