import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { Role } from '../models/user.model';

/**
 * Restricts a route to a specific role (e.g. { path: 'admin', data: { role: 'ADMIN' } }).
 * Like authGuard, this is UX-only - Spring Security's `hasRole(...)` rules on the
 * backend are the actual authorization boundary.
 */
export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredRole = route.data['role'] as Role | undefined;

  if (!authService.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }

  if (requiredRole && authService.getRole() !== requiredRole) {
    return router.createUrlTree(['/']);
  }

  return true;
};
