import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AddressService } from './address.service';
import { AddressRequest, AddressResponse } from '../models/address.model';
import { environment } from '../../../environments/environment';

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

const ADDRESS_REQUEST: AddressRequest = {
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
};

describe('AddressService', () => {
  let service: AddressService;
  let httpMock: HttpTestingController;
  const addressesUrl = `${environment.apiUrl}/users/me/addresses`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AddressService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('has an empty addresses signal before any request', () => {
    expect(service.addresses()).toEqual([]);
  });

  it('getAddresses() sends GET /api/users/me/addresses and updates the addresses signal', () => {
    let result: AddressResponse[] | undefined;

    service.getAddresses().subscribe((r) => (result = r));

    const req = httpMock.expectOne(addressesUrl);
    expect(req.request.method).toBe('GET');
    req.flush([HOME_ADDRESS, WORK_ADDRESS]);

    expect(result).toEqual([HOME_ADDRESS, WORK_ADDRESS]);
    expect(service.addresses()).toEqual([HOME_ADDRESS, WORK_ADDRESS]);
  });

  it('createAddress() sends POST with the request body, does not send userId, then refreshes the list', () => {
    let result: AddressResponse | undefined;

    service.createAddress(ADDRESS_REQUEST).subscribe((r) => (result = r));

    const createReq = httpMock.expectOne(addressesUrl);
    expect(createReq.request.method).toBe('POST');
    expect(createReq.request.body).toEqual(ADDRESS_REQUEST);
    expect(createReq.request.body.userId).toBeUndefined();
    createReq.flush(HOME_ADDRESS);

    const listReq = httpMock.expectOne(addressesUrl);
    expect(listReq.request.method).toBe('GET');
    listReq.flush([HOME_ADDRESS]);

    expect(result).toEqual(HOME_ADDRESS);
    expect(service.addresses()).toEqual([HOME_ADDRESS]);
  });

  it('updateAddress() sends PUT /api/users/me/addresses/{id} with the request body, then refreshes the list', () => {
    let result: AddressResponse | undefined;
    const updated: AddressResponse = { ...WORK_ADDRESS, city: 'Bengaluru' };

    service.updateAddress(2, ADDRESS_REQUEST).subscribe((r) => (result = r));

    const updateReq = httpMock.expectOne(`${addressesUrl}/2`);
    expect(updateReq.request.method).toBe('PUT');
    expect(updateReq.request.body).toEqual(ADDRESS_REQUEST);
    updateReq.flush(updated);

    const listReq = httpMock.expectOne(addressesUrl);
    listReq.flush([HOME_ADDRESS, updated]);

    expect(result).toEqual(updated);
    expect(service.addresses()).toEqual([HOME_ADDRESS, updated]);
  });

  it('deleteAddress() sends DELETE /api/users/me/addresses/{id}, then refreshes the list', () => {
    let completed = false;

    service.deleteAddress(2).subscribe(() => (completed = true));

    const deleteReq = httpMock.expectOne(`${addressesUrl}/2`);
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);

    const listReq = httpMock.expectOne(addressesUrl);
    listReq.flush([HOME_ADDRESS]);

    expect(completed).toBe(true);
    expect(service.addresses()).toEqual([HOME_ADDRESS]);
  });

  it('setDefaultAddress() sends PUT /api/users/me/addresses/{id}/default, then refreshes the list', () => {
    let result: AddressResponse | undefined;
    const promoted: AddressResponse = { ...WORK_ADDRESS, isDefault: true };
    const demoted: AddressResponse = { ...HOME_ADDRESS, isDefault: false };

    service.setDefaultAddress(2).subscribe((r) => (result = r));

    const defaultReq = httpMock.expectOne(`${addressesUrl}/2/default`);
    expect(defaultReq.request.method).toBe('PUT');
    defaultReq.flush(promoted);

    const listReq = httpMock.expectOne(addressesUrl);
    listReq.flush([demoted, promoted]);

    expect(result).toEqual(promoted);
    expect(service.addresses()).toEqual([demoted, promoted]);
  });

  it('propagates a failed mutation and leaves the existing addresses signal untouched', () => {
    service.getAddresses().subscribe();
    httpMock.expectOne(addressesUrl).flush([HOME_ADDRESS]);
    expect(service.addresses()).toEqual([HOME_ADDRESS]);

    let error: unknown;
    service.createAddress(ADDRESS_REQUEST).subscribe({
      error: (err) => (error = err),
    });

    httpMock
      .expectOne(addressesUrl)
      .flush(
        {
          timestamp: '2026-01-10T12:00:00',
          status: 400,
          message: 'Validation failed',
          path: '/api/users/me/addresses',
          fieldErrors: { phone: 'Phone must be exactly 10 digits' },
        },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(error).toBeDefined();
    expect(service.addresses()).toEqual([HOME_ADDRESS]);
  });
});
