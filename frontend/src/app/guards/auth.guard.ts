// ============================================================
// frontend/src/app/guards/auth.guard.ts
// ============================================================
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * Protects routes that require the user to be signed in.
 * "Signed in" means either a seller session (sellerId) or a
 * centre session (centreId) exists in localStorage.
 * Redirects unauthenticated visitors to /marketplace with a
 * query param so the nav can show a login prompt if needed.
 */
export const authGuard: CanActivateFn = () => {
  const router = inject(Router);

  const isLoggedIn =
    !!localStorage.getItem('sellerId') ||
    !!localStorage.getItem('centreId');

  if (isLoggedIn) return true;

  router.navigate(['/marketplace'], { queryParams: { authRequired: 'true' } });
  return false;
};