import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';

import { roleGuard } from './role.guard';
import { AuthService } from '../services/auth.service';

function routeRequiring(role: string): ActivatedRouteSnapshot {
  return { data: { role } } as unknown as ActivatedRouteSnapshot;
}

describe('roleGuard', () => {
  let authServiceMock: { isLoggedIn: ReturnType<typeof vi.fn>; getRole: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authServiceMock = { isLoggedIn: vi.fn(), getRole: vi.fn() };

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authServiceMock }]
    });
  });

  it('allows an ADMIN to access an ADMIN-only route', () => {
    authServiceMock.isLoggedIn.mockReturnValue(true);
    authServiceMock.getRole.mockReturnValue('ADMIN');

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(routeRequiring('ADMIN'), {} as never)
    );

    expect(result).toBe(true);
  });

  it('denies a CUSTOMER from an ADMIN-only route', () => {
    authServiceMock.isLoggedIn.mockReturnValue(true);
    authServiceMock.getRole.mockReturnValue('CUSTOMER');
    const router = TestBed.inject(Router);

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(routeRequiring('ADMIN'), {} as never)
    );

    expect(result).toEqual(router.createUrlTree(['/']));
  });

  it('redirects to /login when the user is not authenticated', () => {
    authServiceMock.isLoggedIn.mockReturnValue(false);
    const router = TestBed.inject(Router);

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(routeRequiring('ADMIN'), {} as never)
    );

    expect(result).toEqual(router.createUrlTree(['/login']));
  });
});
