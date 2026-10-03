import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { roleGuard } from './role.guard';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/user.model';

describe('roleGuard Admin Access', () => {
  let authServiceMock: any;
  let routerMock: any;

  beforeEach(() => {
    authServiceMock = {
      isLoggedIn: vi.fn(),
      getRole: vi.fn(),
    };
    routerMock = {
      createUrlTree: vi.fn((routes) => ({ url: routes[0] })),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('should allow access if user has ADMIN role', () => {
    authServiceMock.isLoggedIn.mockReturnValue(true);
    authServiceMock.getRole.mockReturnValue('ADMIN');

    const result = TestBed.runInInjectionContext(() =>
      roleGuard({ data: { role: 'ADMIN' } } as any, {} as any)
    );

    expect(result).toBe(true);
  });

  it('should redirect to root if user has CUSTOMER role', () => {
    authServiceMock.isLoggedIn.mockReturnValue(true);
    authServiceMock.getRole.mockReturnValue('CUSTOMER');

    const result = TestBed.runInInjectionContext(() =>
      roleGuard({ data: { role: 'ADMIN' } } as any, {} as any)
    );

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/']);
    expect(result).toEqual({ url: '/' });
  });

  it('should redirect to login if user is not authenticated', () => {
    authServiceMock.isLoggedIn.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() =>
      roleGuard({ data: { role: 'ADMIN' } } as any, {} as any)
    );

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login']);
    expect(result).toEqual({ url: '/login' });
  });
});
