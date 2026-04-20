import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { ApiService } from './api.service';

/**
 * Shape of an authenticated user returned from the API.
 */
export interface AuthUser {
  /** Numeric primary key. */
  id: number;
  /** User's email address. */
  email: string;
  /** Optional display name. */
  name: string | null;
  /** Subscription tier. */
  plan: 'free' | 'pro';
}

/**
 * Service that manages authentication state and exposes login, register,
 * and logout operations. The current user is stored in a signal so that
 * any component can reactively read it.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  /** The currently authenticated user, or `null` when logged out. */
  readonly currentUser = signal<AuthUser | null>(null);

  /** Derived boolean indicating whether a user session is active. */
  readonly isLoggedIn = computed(() => this.currentUser() !== null);

  constructor() {
    this.init();
  }

  /**
   * Fetches the current session from the server on app startup.
   * Silently sets `currentUser` to `null` on a 401 so the app does
   * not crash when no session cookie is present.
   */
  init(): void {
    this.api.get<AuthUser>('/auth/me').pipe(
      catchError(() => of(null))
    ).subscribe(user => {
      this.currentUser.set(user);
    });
  }

  /**
   * Authenticates with email and password. On success the current user
   * signal is populated from the response.
   * @param email - User's email address.
   * @param password - User's plaintext password.
   * @returns Observable that completes after the session is established.
   */
  login(email: string, password: string): Observable<void> {
    return this.api.post<{ user: AuthUser }>('/auth/login', { email, password }).pipe(
      tap(res => this.currentUser.set(res.user)),
      map(() => void 0)
    );
  }

  /**
   * Creates a new account and immediately starts a session.
   * @param email - Desired email address.
   * @param password - Desired password (min 8 chars).
   * @param name - Optional display name.
   * @returns Observable that completes after the session is established.
   */
  register(email: string, password: string, name?: string): Observable<void> {
    return this.api.post<{ user: AuthUser }>('/auth/register', { email, password, name }).pipe(
      tap(res => this.currentUser.set(res.user)),
      map(() => void 0)
    );
  }

  /**
   * Destroys the current session on the server and clears local state.
   * @returns Observable that completes once the session is terminated.
   */
  logout(): Observable<void> {
    return this.api.post<void>('/auth/logout', {}).pipe(
      tap(() => this.currentUser.set(null))
    );
  }
}
