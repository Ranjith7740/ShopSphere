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

  console.log('ROLE GUARD');
  console.log('isLoggedIn:', authService.isLoggedIn());
  console.log('token:', !!localStorage.getItem('shopsphere_access_token'));
  console.log('role:', authService.getRole());
  console.log('requiredRole:', requiredRole);

  if (!authService.isLoggedIn()) {
    console.log('REDIRECTING TO LOGIN');
    return router.createUrlTree(['/login']);
  }

  if (requiredRole && authService.getRole() !== requiredRole) {
    console.log('REDIRECTING TO HOME - ROLE MISMATCH');
    return router.createUrlTree(['/']);
  }

  return true;
};