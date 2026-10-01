import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, switchMap, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AddressRequest, AddressResponse } from '../models/address.model';

/**
 * Thin HTTP wrapper over the Address API. Creating, updating, deleting, or
 * setting a default address can change which *other* address is the default
 * on the backend (see AddressService#clearCurrentDefault/deleteAddress server
 * side), but each of those endpoints only returns the one address it acted
 * on. Rather than guess at the knock-on effect, every mutation re-fetches the
 * full list afterwards so the shared signal always matches the backend.
 */
@Injectable({ providedIn: 'root' })
export class AddressService {
  private readonly http = inject(HttpClient);

  private readonly addressesUrl = `${environment.apiUrl}/users/me/addresses`;

  private readonly _addresses = signal<AddressResponse[]>([]);
  readonly addresses = this._addresses.asReadonly();

  getAddresses(): Observable<AddressResponse[]> {
    return this.http
      .get<AddressResponse[]>(this.addressesUrl)
      .pipe(tap((addresses) => this._addresses.set(addresses)));
  }

  createAddress(request: AddressRequest): Observable<AddressResponse> {
    return this.http
      .post<AddressResponse>(this.addressesUrl, request)
      .pipe(switchMap((created) => this.getAddresses().pipe(map(() => created))));
  }

  updateAddress(addressId: number, request: AddressRequest): Observable<AddressResponse> {
    return this.http
      .put<AddressResponse>(`${this.addressesUrl}/${addressId}`, request)
      .pipe(switchMap((updated) => this.getAddresses().pipe(map(() => updated))));
  }

  deleteAddress(addressId: number): Observable<void> {
    return this.http
      .delete<void>(`${this.addressesUrl}/${addressId}`)
      .pipe(switchMap(() => this.getAddresses().pipe(map(() => undefined))));
  }

  setDefaultAddress(addressId: number): Observable<AddressResponse> {
    return this.http
      .put<AddressResponse>(`${this.addressesUrl}/${addressId}/default`, {})
      .pipe(switchMap((updated) => this.getAddresses().pipe(map(() => updated))));
  }
}
