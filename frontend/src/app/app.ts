import { Component, computed, effect, inject, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { Menubar } from 'primeng/menubar';
import { Button } from 'primeng/button';
import { Avatar } from 'primeng/avatar';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';
import { AuthService } from './shared/services/auth.service';

/**
 * Root shell component for the Bynder application.
 *
 * Renders the top navigation bar with logo, menu items, dark mode toggle,
 * user plan tag, avatar, and logout button. Hosts the router outlet for
 * all feature views.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, UpperCasePipe, Menubar, Button, Avatar, Tag, Toast],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  /** Injected authentication service. */
  protected readonly authService = inject(AuthService);

  /** Injected Angular router. */
  private readonly router = inject(Router);

  /**
   * Whether dark mode is currently active.
   * Initialised from `localStorage` so the preference survives page refreshes.
   */
  readonly darkMode = signal(localStorage.getItem('bynder.darkMode') === 'true');

  constructor() {
    // Keep the DOM class and localStorage in sync with the signal.
    // Runs once on init (restoring saved preference) and again on every toggle.
    effect(() => {
      document.documentElement.classList.toggle('my-app-dark', this.darkMode());
      localStorage.setItem('bynder.darkMode', String(this.darkMode()));
    });
  }

  /**
   * PrimeNG menu items shown in the navbar when the user is logged in.
   * Returns an empty array when the user is not authenticated.
   */
  readonly menuItems = computed<MenuItem[]>(() => {
    if (!this.authService.isLoggedIn()) {
      return [];
    }
    return [
      { label: 'Collections', icon: 'pi pi-th-large', routerLink: '/collections' },
      { label: 'Billing', icon: 'pi pi-credit-card', routerLink: '/billing' }
    ];
  });

  /**
   * Toggles dark mode. The `effect` in the constructor handles syncing the
   * DOM class and persisting to `localStorage`.
   */
  toggleDarkMode(): void {
    this.darkMode.update(v => !v);
  }

  /**
   * Logs the current user out, then navigates to the login page.
   */
  logout(): void {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/auth/login']);
    });
  }

  /**
   * Returns the first letter of the current user's name or email,
   * used as the avatar label.
   */
  readonly avatarLabel = computed<string>(() => {
    const user = this.authService.currentUser();
    if (!user) return '';
    const display = user.name ?? user.email;
    return display.charAt(0).toUpperCase();
  });
}
