import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthService } from './auth.service';
import { UserResponse } from '../models/user.model';
import { environment } from '../../../environments/environment';

const USER: UserResponse = { id: 1, name: 'Test User', email: 'a@example.com', phone: '9876543210', role: 'CUSTOMER' };

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('posts to /auth/register and returns the created user', () => {
    const request = { name: 'A', email: 'a@example.com', phone: '9876543210', password: 'Passw0rd!' };
    let result: UserResponse | undefined;

    service.register(request).subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(USER);

    expect(result).toEqual(USER);
  });

  it('posts to /auth/login, stores the token and loads the current user', () => {
    service.login({ email: 'a@example.com', password: 'Passw0rd!' }).subscribe();

    const loginReq = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(loginReq.request.method).toBe('POST');
    loginReq.flush({ accessToken: 'a.b.c', tokenType: 'Bearer', expiresInMs: 3600000 });

    expect(localStorage.getItem('shopsphere_access_token')).toBe('a.b.c');
    expect(service.isLoggedIn()).toBe(true);

    // login() also fires a fire-and-forget whoami call so the nav can show the user's name.
    const whoamiReq = httpMock.expectOne(`${environment.apiUrl}/users/me`);
    whoamiReq.flush(USER);

    expect(service.currentUser()).toEqual(USER);
  });

  it('gets the current user from /users/me', () => {
    let result: UserResponse | undefined;

    service.getCurrentUser().subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${environment.apiUrl}/users/me`);
    expect(req.request.method).toBe('GET');
    req.flush(USER);

    expect(result).toEqual(USER);
  });

  it('clears the token and current-user state on logout', () => {
    service.login({ email: 'a@example.com', password: 'Passw0rd!' }).subscribe();
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush({
      accessToken: 'a.b.c',
      tokenType: 'Bearer',
      expiresInMs: 3600000
    });
    httpMock.expectOne(`${environment.apiUrl}/users/me`).flush(USER);

    service.logout();

    expect(localStorage.getItem('shopsphere_access_token')).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
    expect(service.currentUser()).toBeNull();
  });
});
