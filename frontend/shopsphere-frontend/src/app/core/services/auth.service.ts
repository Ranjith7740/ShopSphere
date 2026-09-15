import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, RegisterRequest } from '../models/auth.model';
import { Role, UpdateUserRequest, UserResponse } from '../models/user.model';
import { TokenStorageService } from './token-storage.service';

/**
 * Owns every authentication-related HTTP call and the client-side session (the JWT
 * plus the currently-known user). Components must go through this service instead
 * of calling HttpClient directly.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenStorage = inject(TokenStorageService);

  private readonly authUrl = `${environment.apiUrl}/auth`;
  private readonly usersUrl = `${environment.apiUrl}/users`;

  private readonly _isAuthenticated = signal(this.tokenStorage.getToken() !== null);
  private readonly _currentUser = signal<UserResponse | null>(null);

  readonly isAuthenticated = this._isAuthenticated.asReadonly();
  readonly currentUser = this._currentUser.asReadonly();

  constructor() {
    // Page refresh: the token survives in localStorage, but currentUser doesn't -
    // reload it once so the nav can show the right name without forcing a re-login.
    if (this.tokenStorage.getToken()) {
      this.refreshCurrentUser().subscribe({ error: () => this.logout() });
    }
  }

  register(request: RegisterRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.authUrl}/register`, request);
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.authUrl}/login`, request).pipe(
      tap((response) => {
        this.tokenStorage.setToken(response.accessToken);
        this._isAuthenticated.set(true);
        // Fire-and-forget: the nav's "Welcome, <name>" fills in once this resolves,
        // but callers of login() only care about the login call itself succeeding.
        this.refreshCurrentUser().subscribe();
      })
    );
  }

  getCurrentUser(): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.usersUrl}/me`);
  }

  updateCurrentUser(request: UpdateUserRequest): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.usersUrl}/me`, request).pipe(
      tap((user) => this._currentUser.set(user))
    );
  }

  refreshCurrentUser(): Observable<UserResponse> {
    return this.getCurrentUser().pipe(tap((user) => this._currentUser.set(user)));
  }

  logout(): void {
    this.tokenStorage.clearToken();
    this._isAuthenticated.set(false);
    this._currentUser.set(null);
  }

  isLoggedIn(): boolean {
    return this._isAuthenticated();
  }

  /**
   * Reads the "role" claim straight out of the JWT payload, without verifying the
   * signature - this is only ever used for UX decisions (e.g. hiding a nav link or
   * a route guard). The backend re-checks the role from the verified token on every
   * request, so a tampered claim here cannot grant real access to anything.
   */
  getRole(): Role | null {
    const token = this.tokenStorage.getToken();
    if (!token) {
      return null;
    }

    const payload = this.decodeTokenPayload(token);
    return (payload?.['role'] as Role) ?? null;
  }

  private decodeTokenPayload(token: string): Record<string, unknown> | null {
    try {
      const [, payload] = token.split('.');
      // JWT segments are base64url (uses "-"/"_", no padding), not plain base64.
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      return JSON.parse(atob(padded));
    } catch {
      return null;
    }
  }
}
