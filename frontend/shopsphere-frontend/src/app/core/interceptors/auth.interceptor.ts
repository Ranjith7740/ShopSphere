import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { TokenStorageService } from '../services/token-storage.service';

const PUBLIC_PATHS = ['/auth/register', '/auth/login'];

/**
 * Centrally attaches "Authorization: Bearer <jwt>" to outgoing requests so no
 * individual service has to do it. Skips the public auth endpoints, since a
 * leftover token from a previous session has no bearing on registering/logging in.
 *
 * Also centrally reacts to a 401 from any *protected* call - that always means the
 * session is no longer valid (expired/invalid token), so it logs out and sends the
 * user back to /login instead of leaving every component to notice on its own.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(TokenStorageService);
  const authService = inject(AuthService);
  const router = inject(Router);

  const isPublicPath = PUBLIC_PATHS.some((path) => req.url.includes(path));
  const token = tokenStorage.getToken();

  const outgoingReq =
    token && !isPublicPath
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(outgoingReq).pipe(
    catchError((err: unknown) => {
      if (!isPublicPath && err instanceof HttpErrorResponse && err.status === 401) {
        authService.logout();
        router.navigateByUrl('/login');
      }
      return throwError(() => err);
    })
  );
};
