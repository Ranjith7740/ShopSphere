import { Injectable } from '@angular/core';

const TOKEN_KEY = 'shopsphere_access_token';

/**
 * Single place that knows how the JWT is persisted client-side. Kept separate from
 * AuthService so the storage mechanism (localStorage today) can be swapped later
 * without touching anything that calls AuthService.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  }
}
