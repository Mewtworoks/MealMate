import { Injectable } from '@angular/core';
import { Clerk } from '@clerk/clerk-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ClerkAuthService {
  private clerkInstance: Clerk | null = null;
  private isInitialized = false;

  async getClerk(): Promise<Clerk> {
    if (this.isInitialized && this.clerkInstance) {
      return this.clerkInstance;
    }

    const key = environment.clerkPublishableKey;
    if (!key || key.includes('YOUR_CLERK')) {
      console.warn('Clerk Publishable Key is not configured yet in environment.ts');
    }

    this.clerkInstance = new Clerk(key);
    await this.clerkInstance.load();
    this.isInitialized = true;
    return this.clerkInstance;
  }

  async signInWithEmailAndPassword(email: string, password: string): Promise<any> {
    try {
      const clerk = await this.getClerk();
      if (clerk.session || clerk.user) {
        try { await clerk.signOut(); } catch (e) {}
      }
      const result = await clerk.client.signIn.create({
        identifier: email,
        password: password,
      });

      if (result.status === 'complete') {
        await clerk.setActive({ session: result.createdSessionId });
        return {
          success: true,
          user: clerk.user,
          sessionId: result.createdSessionId
        };
      }
      return { success: false, result };
    } catch (err: any) {
      console.warn('Clerk SignIn Error:', err);
      const errors = err?.errors || [];
      const notFound = errors.some((e: any) => e.code === 'form_identifier_not_found');
      return {
        success: false,
        notFound,
        message: notFound 
          ? 'No account found with this email. Click "Create Account" below!' 
          : (errors[0]?.longMessage || errors[0]?.message || 'Sign in failed. Check your password.')
      };
    }
  }

  async signUpWithEmailAndPassword(email: string, password: string, fullName?: string): Promise<any> {
    try {
      const clerk = await this.getClerk();
      if (clerk.session || clerk.user) {
        try { await clerk.signOut(); } catch (e) {}
      }
      const nameParts = (fullName || '').split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const result = await clerk.client.signUp.create({
        emailAddress: email,
        password: password,
        firstName,
        lastName,
      });

      if (result.status === 'complete') {
        await clerk.setActive({ session: result.createdSessionId });
        return {
          success: true,
          user: clerk.user,
          sessionId: result.createdSessionId
        };
      }
      return { success: false, result };
    } catch (err: any) {
      console.warn('Clerk SignUp Error:', err);
      const errors = err?.errors || [];
      const exists = errors.some((e: any) => e.code === 'form_identifier_exists');
      return {
        success: false,
        exists,
        message: exists 
          ? 'An account already exists with this email. Click "Sign In" instead!' 
          : (errors[0]?.longMessage || errors[0]?.message || 'Account creation failed.')
      };
    }
  }

  async mountSignInComponent(container: HTMLDivElement) {
    const clerk = await this.getClerk();
    clerk.mountSignIn(container);
  }

  async mountSignUpComponent(container: HTMLDivElement) {
    const clerk = await this.getClerk();
    clerk.mountSignUp(container);
  }

  async mountUserButtonComponent(container: HTMLDivElement) {
    const clerk = await this.getClerk();
    clerk.mountUserButton(container);
  }

  async signOut() {
    if (this.clerkInstance) {
      await this.clerkInstance.signOut();
    }
  }
}
