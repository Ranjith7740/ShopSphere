import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { AddressForm } from './address-form';
import { AddressService } from '../../../core/services/address.service';
import { AddressRequest, AddressResponse } from '../../../core/models/address.model';

const EXISTING_ADDRESS: AddressResponse = {
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

class FakeAddressService {
  createImpl: () => Observable<AddressResponse> = () => of(EXISTING_ADDRESS);
  updateImpl: () => Observable<AddressResponse> = () => of(EXISTING_ADDRESS);

  createAddress(_request: AddressRequest): Observable<AddressResponse> {
    return this.createImpl();
  }

  updateAddress(_id: number, _request: AddressRequest): Observable<AddressResponse> {
    return this.updateImpl();
  }
}

@Component({
  template: `<app-address-form [address]="address" (saved)="onSaved($event)" (cancelled)="onCancelled()" />`,
  imports: [AddressForm],
})
class HostComponent {
  address: AddressResponse | null = null;
  savedAddress: AddressResponse | null = null;
  cancelledCalled = false;

  onSaved(address: AddressResponse): void {
    this.savedAddress = address;
  }

  onCancelled(): void {
    this.cancelledCalled = true;
  }
}

describe('AddressForm', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let addressService: FakeAddressService;

  beforeEach(() => {
    addressService = new FakeAddressService();

    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: AddressService, useValue: addressService }],
    });

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  function form(): AddressForm {
    return fixture.debugElement.children[0].componentInstance as AddressForm;
  }

  it('marks required fields invalid when submitted empty', () => {
    fixture.detectChanges();
    form().submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Full name is required');
    expect(fixture.nativeElement.textContent).toContain('Phone is required');
    expect(fixture.nativeElement.textContent).toContain('Address line 1 is required');
  });

  it('rejects an invalid phone number', () => {
    fixture.detectChanges();
    form().form.controls.phone.setValue('12345');
    form().form.controls.phone.markAsTouched();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Phone must be exactly 10 digits');
  });

  it('rejects an invalid postal code', () => {
    fixture.detectChanges();
    form().form.controls.postalCode.setValue('12');
    form().form.controls.postalCode.markAsTouched();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Postal code must be 4 to 10 digits');
  });

  it('defaults the address type control to HOME', () => {
    fixture.detectChanges();
    expect(form().form.controls.type.value).toBe('HOME');
  });

  function fillValidForm(): void {
    form().form.setValue({
      fullName: 'Jane Doe',
      phone: '9876543210',
      addressLine1: '12 Example Street',
      addressLine2: 'Near Example',
      city: 'Chennai',
      state: 'Tamil Nadu',
      postalCode: '600001',
      country: 'India',
      type: 'HOME',
      isDefault: false,
    });
  }

  it('calls createAddress and emits saved on successful create submission', () => {
    fixture.detectChanges();
    fillValidForm();

    const createSpy = vi.fn().mockReturnValue(of(EXISTING_ADDRESS));
    addressService.createAddress = createSpy;

    form().submit();
    fixture.detectChanges();

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: 'Jane Doe', phone: '9876543210' }),
    );
    expect(host.savedAddress).toEqual(EXISTING_ADDRESS);
  });

  it('calls updateAddress with the existing address id on edit submission', () => {
    host.address = EXISTING_ADDRESS;
    fixture.detectChanges();

    const updateSpy = vi.fn().mockReturnValue(of(EXISTING_ADDRESS));
    addressService.updateAddress = updateSpy;

    form().submit();
    fixture.detectChanges();

    expect(updateSpy).toHaveBeenCalledWith(1, expect.objectContaining({ fullName: 'Jane Doe' }));
    expect(host.savedAddress).toEqual(EXISTING_ADDRESS);
  });

  it('does not submit when the form is invalid', () => {
    fixture.detectChanges();

    const createSpy = vi.fn().mockReturnValue(of(EXISTING_ADDRESS));
    addressService.createAddress = createSpy;

    form().submit();
    fixture.detectChanges();

    expect(createSpy).not.toHaveBeenCalled();
    expect(host.savedAddress).toBeNull();
  });

  it('populates the form with the existing address values in edit mode', () => {
    host.address = EXISTING_ADDRESS;
    fixture.detectChanges();

    expect(form().form.getRawValue()).toEqual({
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
    });
  });

  it('shows the backend error message when submission fails', () => {
    fixture.detectChanges();
    fillValidForm();

    addressService.createAddress = vi
      .fn()
      .mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 404, error: { message: 'Not found' } })),
      );

    form().submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Address not found.');
    expect(host.savedAddress).toBeNull();
  });

  it('emits cancelled when the cancel button is clicked', () => {
    fixture.detectChanges();
    form().cancel();

    expect(host.cancelledCalled).toBe(true);
  });
});
