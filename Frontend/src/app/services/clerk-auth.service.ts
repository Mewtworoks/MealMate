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

      // If user is already active in Clerk for this email, return existing user session
      if (clerk.user && clerk.user.primaryEmailAddress?.emailAddress.toLowerCase() === email.trim().toLowerCase()) {
        return {
          success: true,
          user: clerk.user,
          sessionId: clerk.session?.id
        };
      }

      // If signed in under a different user or stale session exists, clear session first
      if (clerk.user || clerk.session) {
        await clerk.signOut();
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
      const alreadySignedIn = errors.some((e: any) => e.code === 'session_exists' || e.message?.includes('already signed in'));

      if (alreadySignedIn) {
        try {
          const clerk = await this.getClerk();
          if (clerk.user) {
            return {
              success: true,
              user: clerk.user,
              sessionId: clerk.session?.id
            };
          }
          await clerk.signOut();
          const retryResult = await clerk.client.signIn.create({
            identifier: email,
            password: password,
          });
          if (retryResult.status === 'complete') {
            await clerk.setActive({ session: retryResult.createdSessionId });
            return {
              success: true,
              user: clerk.user,
              sessionId: retryResult.createdSessionId
            };
          }
        } catch (retryErr: any) {
          console.warn('Clerk retry error:', retryErr);
        }
      }

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

      if (clerk.user || clerk.session) {
        await clerk.signOut();
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
    try {
      const clerk = await this.getClerk();
      if (clerk) {
        await clerk.signOut();
      }
    } catch (e) {
      console.warn('Clerk signOut error:', e);
    }
  }
}
