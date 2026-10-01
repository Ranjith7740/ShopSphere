import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, map, of, switchMap, tap, throwError } from 'rxjs';
import { vi } from 'vitest';

import { Addresses } from './addresses';
import { AddressService } from '../../../core/services/address.service';
import { AddressRequest, AddressResponse } from '../../../core/models/address.model';

/**
 * Mirrors AddressService's real tap-based signal update, with each HTTP call
 * swappable per test (success, error, or a Subject to control timing) -
 * exactly like CartService's test double.
 */
class FakeAddressService {
  private readonly _addresses = signal<AddressResponse[]>([]);
  readonly addresses = this._addresses.asReadonly();

  getAddressesImpl: () => Observable<AddressResponse[]> = () =>
    throwError(() => new Error('not stubbed'));
  createAddressImpl: (request: AddressRequest) => Observable<AddressResponse> = () =>
    throwError(() => new Error('not stubbed'));
  updateAddressImpl: (id: number, request: AddressRequest) => Observable<AddressResponse> = () =>
    throwError(() => new Error('not stubbed'));
  deleteAddressImpl: (id: number) => Observable<void> = () =>
    throwError(() => new Error('not stubbed'));
  setDefaultAddressImpl: (id: number) => Observable<AddressResponse> = () =>
    throwError(() => new Error('not stubbed'));

  getAddresses(): Observable<AddressResponse[]> {
    return this.getAddressesImpl().pipe(tap((addresses) => this._addresses.set(addresses)));
  }

  createAddress(request: AddressRequest): Observable<AddressResponse> {
    return this.createAddressImpl(request);
  }

  updateAddress(id: number, request: AddressRequest): Observable<AddressResponse> {
    return this.updateAddressImpl(id, request);
  }

  deleteAddress(id: number): Observable<void> {
    return this.deleteAddressImpl(id).pipe(switchMap(() => this.getAddresses().pipe(map(() => undefined))));
  }

  setDefaultAddress(id: number): Observable<AddressResponse> {
    return this.setDefaultAddressImpl(id).pipe(
      switchMap((updated) => this.getAddresses().pipe(map(() => updated))),
    );
  }
}

const HOME_ADDRESS: AddressResponse = {
  id: 1,
  fullName: 'Jane Doe',
  phone: '9876543210',
  addressLine1: '12 Example Street',
  addressLine2: 'Near Example',
  city: 'Chennai',
  state: 'Tamil Nadu',
  postalCode: '600001',
  country: 'India',
  type: 'HOME',
  isDefault: true,
  createdAt: '2026-01-01T10:00:00',
  updatedAt: '2026-01-01T10:00:00',
};

const WORK_ADDRESS: AddressResponse = {
  id: 2,
  fullName: 'Jane Doe',
  phone: '9876543210',
  addressLine1: '45 Office Park',
  addressLine2: null,
  city: 'Chennai',
  state: 'Tamil Nadu',
  postalCode: '600002',
  country: 'India',
  type: 'WORK',
  isDefault: false,
  createdAt: '2026-01-02T10:00:00',
  updatedAt: '2026-01-02T10:00:00',
};

describe('Addresses', () => {
  let addressService: FakeAddressService;

  function createFixture() {
    addressService = new FakeAddressService();

    TestBed.configureTestingModule({
      imports: [Addresses],
      providers: [{ provide: AddressService, useValue: addressService }],
    });

    const fixture = TestBed.createComponent(Addresses);
    return fixture;
  }

  it('shows a loading status before the initial request resolves', () => {
    const fixture = createFixture();
    addressService.getAddressesImpl = vi.fn().mockReturnValue(new Subject<AddressResponse[]>());

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Loading addresses...');
  });

  it('renders addresses after a successful load', () => {
    const fixture = createFixture();
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([HOME_ADDRESS, WORK_ADDRESS]));

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Jane Doe');
    expect(text).toContain('12 Example Street');
    expect(text).toContain('Default');
  });

  it('shows the empty state when there are no addresses', () => {
    const fixture = createFixture();
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([]));

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No saved addresses');
    expect(fixture.nativeElement.querySelector('button')?.textContent).toContain('Add Address');
  });

  it('shows a friendly error and a retry button when loading fails', () => {
    const fixture = createFixture();
    addressService.getAddressesImpl = vi
      .fn()
      .mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Something went wrong');
    const retryButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((btn) => btn.textContent?.includes('Retry'));
    expect(retryButton).toBeTruthy();
  });

  it('retry() re-issues the request after a failure', () => {
    const fixture = createFixture();
    addressService.getAddressesImpl = vi
      .fn()
      .mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    fixture.detectChanges();

    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([HOME_ADDRESS]));
    fixture.componentInstance.retry();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Jane Doe');
  });

  it('opens the edit form with the selected address', () => {
    const fixture = createFixture();
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([HOME_ADDRESS]));
    fixture.detectChanges();

    fixture.componentInstance.openEditForm(HOME_ADDRESS);
    fixture.detectChanges();

    expect(fixture.componentInstance.editingAddress()).toEqual(HOME_ADDRESS);
    expect(fixture.componentInstance.showForm()).toBe(true);
  });

  it('asks for confirmation before deleting and does nothing if declined', () => {
    const fixture = createFixture();
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([HOME_ADDRESS]));
    fixture.detectChanges();

    const deleteSpy = vi.fn().mockReturnValue(of(undefined));
    addressService.deleteAddressImpl = deleteSpy;
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    fixture.componentInstance.onDelete(HOME_ADDRESS);

    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('deletes an address and refreshes the list after confirmation', () => {
    const fixture = createFixture();
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([HOME_ADDRESS, WORK_ADDRESS]));
    fixture.detectChanges();

    addressService.deleteAddressImpl = vi.fn().mockReturnValue(of(undefined));
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([WORK_ADDRESS]));
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    fixture.componentInstance.onDelete(HOME_ADDRESS);
    fixture.detectChanges();

    expect(fixture.componentInstance.addresses()).toEqual([WORK_ADDRESS]);
    expect(fixture.nativeElement.textContent).toContain('Address deleted successfully.');
  });

  it('sets a different address as default', () => {
    const fixture = createFixture();
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([HOME_ADDRESS, WORK_ADDRESS]));
    fixture.detectChanges();

    const promoted = { ...WORK_ADDRESS, isDefault: true };
    const demoted = { ...HOME_ADDRESS, isDefault: false };
    addressService.setDefaultAddressImpl = vi.fn().mockReturnValue(of(promoted));
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([demoted, promoted]));

    fixture.componentInstance.onSetDefault(WORK_ADDRESS);
    fixture.detectChanges();

    expect(fixture.componentInstance.addresses()).toEqual([demoted, promoted]);
    expect(fixture.nativeElement.textContent).toContain('Default address updated.');
  });

  it('does not render a Set as Default action for the current default address', () => {
    const fixture = createFixture();
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([HOME_ADDRESS]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Set as Default');
  });

  it('disables deletion for the row already being deleted but not other rows', () => {
    const fixture = createFixture();
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([HOME_ADDRESS, WORK_ADDRESS]));
    fixture.detectChanges();

    const deleteSubject = new Subject<void>();
    addressService.deleteAddressImpl = vi.fn().mockReturnValue(deleteSubject.asObservable());
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    fixture.componentInstance.onDelete(HOME_ADDRESS);
    fixture.detectChanges();

    expect(fixture.componentInstance.isDeleting(HOME_ADDRESS.id)).toBe(true);
    expect(fixture.componentInstance.isDeleting(WORK_ADDRESS.id)).toBe(false);
  });

  it('shows a row-level error when delete fails and leaves the list untouched', () => {
    const fixture = createFixture();
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([HOME_ADDRESS]));
    fixture.detectChanges();

    addressService.deleteAddressImpl = vi
      .fn()
      .mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    fixture.componentInstance.onDelete(HOME_ADDRESS);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Address not found.');
    expect(fixture.componentInstance.addresses()).toEqual([HOME_ADDRESS]);
  });
});
