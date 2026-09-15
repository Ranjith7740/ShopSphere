import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';

import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  let authServiceMock: { isLoggedIn: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authServiceMock = { isLoggedIn: vi.fn() };

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authServiceMock }],
    });
  });

  it('allows navigation when the user is logged in', () => {
    authServiceMock.isLoggedIn.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(result).toBe(true);
  });

  it('redirects to /login when the user is not logged in', () => {
    authServiceMock.isLoggedIn.mockReturnValue(false);
    const router = TestBed.inject(Router);

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(result).toEqual(router.createUrlTree(['/login']));
  });
});
