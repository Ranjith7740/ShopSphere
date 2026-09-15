import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';

import { authInterceptor } from './auth.interceptor';
import { TokenStorageService } from '../services/token-storage.service';
import { AuthService } from '../services/auth.service';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authServiceMock: { logout: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    localStorage.clear();
    authServiceMock = { logout: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('attaches the Authorization header when a token is present', () => {
    TestBed.inject(TokenStorageService).setToken('a.b.c');

    httpClient.get('/api/users/me').subscribe();

    const req = httpMock.expectOne('/api/users/me');
    expect(req.request.headers.get('Authorization')).toBe('Bearer a.b.c');
    req.flush({});
  });

  it('does not add an Authorization header when there is no token', () => {
    httpClient.get('/api/categories').subscribe();

    const req = httpMock.expectOne('/api/categories');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('does not attach a leftover token to the public login/register endpoints', () => {
    TestBed.inject(TokenStorageService).setToken('a.b.c');

    httpClient.post('/api/auth/login', {}).subscribe();

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('logs out and redirects to /login on a 401 from a protected call', () => {
    TestBed.inject(TokenStorageService).setToken('a.b.c');
    const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');

    httpClient.get('/api/users/me').subscribe({ error: () => undefined });

    const req = httpMock.expectOne('/api/users/me');
    req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(authServiceMock.logout).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith('/login');
  });
});
