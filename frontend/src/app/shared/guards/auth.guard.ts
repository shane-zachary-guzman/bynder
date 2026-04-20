import { inject } from '@angular/core';
import { CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Functional route guard that redirects unauthenticated visitors to the
 * login page, preserving the originally requested URL as a `returnUrl`
 * query parameter so the login page can redirect back after a successful
 * sign-in.
 *
 * @param _route - Unused activated route snapshot.
 * @param state - Router state snapshot used to capture the attempted URL.
 * @returns `true` if the user is logged in; otherwise navigates to
 *   `/auth/login?returnUrl=<attempted-url>` and returns `false`.
 */
export const authGuard: CanActivateFn = (_route, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
