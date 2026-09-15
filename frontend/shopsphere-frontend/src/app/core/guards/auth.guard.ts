import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * UX-level protection only. The real authorization boundary is Spring Security
 * on the backend - this guard just keeps an unauthenticated user from seeing a
 * page whose API calls would fail with 401 anyway.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
