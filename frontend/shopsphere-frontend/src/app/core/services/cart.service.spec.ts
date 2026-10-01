import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { CartService } from './cart.service';
import { CartResponse } from '../models/cart.model';
import { environment } from '../../../environments/environment';

const CART: CartResponse = {
  cartId: 1,
  items: [
    {
      id: 10,
      productId: 1,
      productName: 'Wireless Mouse',
      quantity: 2,
      unitPrice: 29.99,
      subtotal: 59.98,
      availableStock: 120,
      productActive: true,
    },
  ],
  cartTotal: 59.98,
};

const UPDATED_CART: CartResponse = {
  cartId: 1,
  items: [
    {
      id: 10,
      productId: 1,
      productName: 'Wireless Mouse',
      quantity: 3,
      unitPrice: 29.99,
      subtotal: 89.97,
      availableStock: 120,
      productActive: true,
    },
  ],
  cartTotal: 89.97,
};

const EMPTY_CART: CartResponse = {
  cartId: 1,
  items: [],
  cartTotal: 0,
};

describe('CartService', () => {
  let service: CartService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CartService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('has a null cart signal before any request', () => {
    expect(service.cart()).toBeNull();
  });

  it('getCart() sends GET /api/cart and updates the cart signal', () => {
    let result: CartResponse | undefined;

    service.getCart().subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${environment.apiUrl}/cart`);
    expect(req.request.method).toBe('GET');
    req.flush(CART);

    expect(result).toEqual(CART);
    expect(service.cart()).toEqual(CART);
  });

  it('addItem() sends POST /api/cart/items with the request body and updates the cart signal', () => {
    let result: CartResponse | undefined;

    service.addItem({ productId: 1, quantity: 2 }).subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${environment.apiUrl}/cart/items`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ productId: 1, quantity: 2 });
    req.flush(CART);

    expect(result).toEqual(CART);
    expect(service.cart()).toEqual(CART);
  });

  it('updateItem() sends PUT /api/cart/items/{cartItemId} with the request body and updates the cart signal', () => {
    let result: CartResponse | undefined;

    service.updateItem(10, { quantity: 3 }).subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${environment.apiUrl}/cart/items/10`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ quantity: 3 });
    req.flush(UPDATED_CART);

    expect(result).toEqual(UPDATED_CART);
    expect(service.cart()).toEqual(UPDATED_CART);
  });

  it('removeItem() sends DELETE /api/cart/items/{cartItemId} and updates the cart signal', () => {
    let result: CartResponse | undefined;

    service.removeItem(10).subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${environment.apiUrl}/cart/items/10`);
    expect(req.request.method).toBe('DELETE');
    req.flush(EMPTY_CART);

    expect(result).toEqual(EMPTY_CART);
    expect(service.cart()).toEqual(EMPTY_CART);
  });

  it('clearCart() sends DELETE /api/cart/items and updates the cart signal', () => {
    let result: CartResponse | undefined;

    service.clearCart().subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${environment.apiUrl}/cart/items`);
    expect(req.request.method).toBe('DELETE');
    req.flush(EMPTY_CART);

    expect(result).toEqual(EMPTY_CART);
    expect(service.cart()).toEqual(EMPTY_CART);
  });

  it('propagates a failed request and leaves the existing cart signal untouched', () => {
    service.getCart().subscribe();
    httpMock.expectOne(`${environment.apiUrl}/cart`).flush(CART);
    expect(service.cart()).toEqual(CART);

    let error: unknown;
    service.addItem({ productId: 1, quantity: 999 }).subscribe({
      error: (err) => (error = err),
    });

    httpMock
      .expectOne(`${environment.apiUrl}/cart/items`)
      .flush(
        {
          timestamp: '2026-01-10T12:00:00',
          status: 409,
          message: 'Insufficient stock',
          path: '/api/cart/items',
          fieldErrors: null,
        },
        { status: 409, statusText: 'Conflict' },
      );

    expect(error).toBeDefined();
    expect(service.cart()).toEqual(CART);
  });

  it('applies the latest backend response across multiple successful mutations', () => {
    service.addItem({ productId: 1, quantity: 2 }).subscribe();
    httpMock.expectOne(`${environment.apiUrl}/cart/items`).flush(CART);
    expect(service.cart()).toEqual(CART);

    service.updateItem(10, { quantity: 3 }).subscribe();
    httpMock.expectOne(`${environment.apiUrl}/cart/items/10`).flush(UPDATED_CART);
    expect(service.cart()).toEqual(UPDATED_CART);

    service.clearCart().subscribe();
    httpMock.expectOne(`${environment.apiUrl}/cart/items`).flush(EMPTY_CART);
    expect(service.cart()).toEqual(EMPTY_CART);
  });
});
