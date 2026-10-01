import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AddCartItemRequest, CartResponse, UpdateCartItemRequest } from '../models/cart.model';

/**
 * Thin HTTP wrapper over the Cart API. Every mutating call replaces the
 * shared cart signal with the backend's response - never with locally
 * computed data - since the backend is the sole source of truth for
 * quantities, stock, and totals.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly http = inject(HttpClient);

  private readonly cartUrl = `${environment.apiUrl}/cart`;

  private readonly _cart = signal<CartResponse | null>(null);
  readonly cart = this._cart.asReadonly();

  getCart(): Observable<CartResponse> {
    return this.http.get<CartResponse>(this.cartUrl).pipe(tap((cart) => this._cart.set(cart)));
  }

  addItem(request: AddCartItemRequest): Observable<CartResponse> {
    return this.http
      .post<CartResponse>(`${this.cartUrl}/items`, request)
      .pipe(tap((cart) => this._cart.set(cart)));
  }

  updateItem(cartItemId: number, request: UpdateCartItemRequest): Observable<CartResponse> {
    return this.http
      .put<CartResponse>(`${this.cartUrl}/items/${cartItemId}`, request)
      .pipe(tap((cart) => this._cart.set(cart)));
  }

  removeItem(cartItemId: number): Observable<CartResponse> {
    return this.http
      .delete<CartResponse>(`${this.cartUrl}/items/${cartItemId}`)
      .pipe(tap((cart) => this._cart.set(cart)));
  }

  clearCart(): Observable<CartResponse> {
    return this.http
      .delete<CartResponse>(`${this.cartUrl}/items`)
      .pipe(tap((cart) => this._cart.set(cart)));
  }
}
