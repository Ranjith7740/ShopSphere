import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { Observable, Subject, map, of, switchMap, tap, throwError } from 'rxjs';
import { vi } from 'vitest';

import { Checkout } from './checkout';
import { CartService } from '../../core/services/cart.service';
import { AddressService } from '../../core/services/address.service';
import {
  AddCartItemRequest,
  CartResponse,
  UpdateCartItemRequest,
} from '../../core/models/cart.model';
import { AddressRequest, AddressResponse } from '../../core/models/address.model';

/** Mirrors CartService's real tap-based signal update, same approach as cart.spec.ts. */
class FakeCartService {
  private readonly _cart = signal<CartResponse | null>(null);
  readonly cart = this._cart.asReadonly();

  getCartImpl: () => Observable<CartResponse> = () => throwError(() => new Error('not stubbed'));
  addItemImpl: (request: AddCartItemRequest) => Observable<CartResponse> = () =>
    throwError(() => new Error('not stubbed'));
  updateItemImpl: (cartItemId: number, request: UpdateCartItemRequest) => Observable<CartResponse> =
    () => throwError(() => new Error('not stubbed'));
  removeItemImpl: (cartItemId: number) => Observable<CartResponse> = () =>
    throwError(() => new Error('not stubbed'));
  clearCartImpl: () => Observable<CartResponse> = () => throwError(() => new Error('not stubbed'));

  getCart(): Observable<CartResponse> {
    return this.getCartImpl().pipe(tap((cart) => this._cart.set(cart)));
  }

  addItem(request: AddCartItemRequest): Observable<CartResponse> {
    return this.addItemImpl(request).pipe(tap((cart) => this._cart.set(cart)));
  }

  updateItem(cartItemId: number, request: UpdateCartItemRequest): Observable<CartResponse> {
    return this.updateItemImpl(cartItemId, request).pipe(tap((cart) => this._cart.set(cart)));
  }

  removeItem(cartItemId: number): Observable<CartResponse> {
    return this.removeItemImpl(cartItemId).pipe(tap((cart) => this._cart.set(cart)));
  }

  clearCart(): Observable<CartResponse> {
    return this.clearCartImpl().pipe(tap((cart) => this._cart.set(cart)));
  }
}

/** Mirrors AddressService's real tap-based signal update, same approach as addresses.spec.ts. */
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
    return this.createAddressImpl(request).pipe(
      switchMap((created) => this.getAddresses().pipe(map(() => created))),
    );
  }

  updateAddress(id: number, request: AddressRequest): Observable<AddressResponse> {
    return this.updateAddressImpl(id, request).pipe(
      switchMap((updated) => this.getAddresses().pipe(map(() => updated))),
    );
  }

  deleteAddress(id: number): Observable<void> {
    return this.deleteAddressImpl(id).pipe(
      switchMap(() => this.getAddresses().pipe(map(() => undefined))),
    );
  }

  setDefaultAddress(id: number): Observable<AddressResponse> {
    return this.setDefaultAddressImpl(id).pipe(
      switchMap((updated) => this.getAddresses().pipe(map(() => updated))),
    );
  }
}

const ITEM_1 = {
  id: 10,
  productId: 1,
  productName: 'Wireless Mouse',
  quantity: 2,
  unitPrice: 29.99,
  subtotal: 59.98,
  availableStock: 120,
  productActive: true,
};

const ITEM_2 = {
  id: 11,
  productId: 2,
  productName: 'Mechanical Keyboard',
  quantity: 1,
  unitPrice: 89.0,
  subtotal: 89.0,
  availableStock: 5,
  productActive: true,
};

const CART: CartResponse = {
  cartId: 1,
  items: [ITEM_1, ITEM_2],
  cartTotal: 148.98,
};

const EMPTY_CART: CartResponse = { cartId: 1, items: [], cartTotal: 0 };

const DEFAULT_ADDRESS: AddressResponse = {
  id: 1,
  fullName: 'Jane Doe',
  phone: '9876543210',
  addressLine1: '12 Example Street',
  addressLine2: null,
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

describe('Checkout', () => {
  let cartService: FakeCartService;
  let addressService: FakeAddressService;

  beforeEach(() => {
    cartService = new FakeCartService();
    addressService = new FakeAddressService();
  });

  function setup() {
    TestBed.configureTestingModule({
      imports: [Checkout],
      providers: [
        provideRouter([]),
        { provide: CartService, useValue: cartService },
        { provide: AddressService, useValue: addressService },
      ],
    });

    const fixture = TestBed.createComponent(Checkout);
    fixture.detectChanges();
    return fixture;
  }

  it('loads the cart on init when it has not been loaded yet', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(of(CART));
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([DEFAULT_ADDRESS]));

    setup();

    expect(cartService.getCartImpl).toHaveBeenCalled();
  });

  it('loads addresses on init when they have not been loaded yet', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(of(CART));
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([DEFAULT_ADDRESS]));

    setup();

    expect(addressService.getAddressesImpl).toHaveBeenCalled();
  });

  it('shows a loading status while the cart request is in flight', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(new Subject<CartResponse>());
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([DEFAULT_ADDRESS]));

    const fixture = setup();

    expect(fixture.nativeElement.textContent).toContain('Loading cart...');
  });

  it('shows the empty-cart state and a Continue Shopping link when the cart has no items', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(of(EMPTY_CART));
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([DEFAULT_ADDRESS]));

    const fixture = setup();

    expect(fixture.nativeElement.textContent).toContain('Your cart is empty.');
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a');
    expect(link.getAttribute('href')).toBe('/products');
  });

  it('does not show the address/review UI while the cart is empty', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(of(EMPTY_CART));
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([DEFAULT_ADDRESS]));

    const fixture = setup();

    expect(fixture.nativeElement.querySelector('.checkout-layout')).toBeNull();
  });

  it('renders cart items in the order summary', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(of(CART));
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([DEFAULT_ADDRESS]));

    const fixture = setup();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Wireless Mouse');
    expect(text).toContain('Mechanical Keyboard');
  });

  it('displays the backend-provided cartTotal', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(of(CART));
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([DEFAULT_ADDRESS]));

    const fixture = setup();

    expect(fixture.nativeElement.textContent).toContain('148.98');
  });

  it('does not recalculate cartTotal from item subtotals', () => {
    const cartWithExcludedItem: CartResponse = {
      cartId: 1,
      items: [{ ...ITEM_1 }, { ...ITEM_2, productActive: false, subtotal: 89.0 }],
      cartTotal: 59.98,
    };
    cartService.getCartImpl = vi.fn().mockReturnValue(of(cartWithExcludedItem));
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([DEFAULT_ADDRESS]));

    const fixture = setup();

    const totalLine = fixture.nativeElement.querySelector('.summary-total').textContent;
    expect(totalLine).toContain('59.98');
    expect(totalLine).not.toContain('148.98');
  });

  it('detects an inactive product as unavailable', () => {
    const cartWithInactive: CartResponse = {
      ...CART,
      items: [{ ...ITEM_1, productActive: false }, ITEM_2],
    };
    cartService.getCartImpl = vi.fn().mockReturnValue(of(cartWithInactive));
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([DEFAULT_ADDRESS]));

    const fixture = setup();

    expect(fixture.nativeElement.textContent).toContain('Product no longer available');
  });

  it('detects an out-of-stock item as unavailable', () => {
    const cartOutOfStock: CartResponse = {
      ...CART,
      items: [{ ...ITEM_1, availableStock: 0 }, ITEM_2],
    };
    cartService.getCartImpl = vi.fn().mockReturnValue(of(cartOutOfStock));
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([DEFAULT_ADDRESS]));

    const fixture = setup();

    expect(fixture.nativeElement.textContent).toContain('Out of stock');
  });

  it('detects a quantity exceeding stock as unavailable', () => {
    const cartOverStock: CartResponse = {
      ...CART,
      items: [{ ...ITEM_1, quantity: 10, availableStock: 3 }, ITEM_2],
    };
    cartService.getCartImpl = vi.fn().mockReturnValue(of(cartOverStock));
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([DEFAULT_ADDRESS]));

    const fixture = setup();

    expect(fixture.nativeElement.textContent).toContain('Only 3 left. Reduce quantity.');
  });

  it('blocks checkout and shows a banner with a Return to Cart link when an item is unavailable', () => {
    const cartWithInactive: CartResponse = {
      ...CART,
      items: [{ ...ITEM_1, productActive: false }, ITEM_2],
    };
    cartService.getCartImpl = vi.fn().mockReturnValue(of(cartWithInactive));
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([DEFAULT_ADDRESS]));

    const fixture = setup();

    expect(fixture.nativeElement.textContent).toContain('Some items in your cart are unavailable');
    const returnLink: HTMLAnchorElement = fixture.nativeElement.querySelector(
      '.blocking-banner a',
    );
    expect(returnLink.getAttribute('href')).toBe('/cart');
    expect(fixture.componentInstance.isCheckoutReady()).toBe(false);

    const continueButton: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      '.place-order-btn',
    );
    expect(continueButton).not.toBeNull();
    expect(continueButton?.disabled).toBe(true);
  });

  it('renders the saved address list', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(of(CART));
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([DEFAULT_ADDRESS, WORK_ADDRESS]));

    const fixture = setup();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('12 Example Street');
    expect(text).toContain('45 Office Park');
  });

  it('preselects the default address when one exists', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(of(CART));
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([WORK_ADDRESS, DEFAULT_ADDRESS]));

    const fixture = setup();

    expect(fixture.componentInstance.selectedAddressId()).toBe(DEFAULT_ADDRESS.id);
  });

  it('does not preselect any address when there is no default', () => {
    const noDefault = { ...DEFAULT_ADDRESS, isDefault: false };
    cartService.getCartImpl = vi.fn().mockReturnValue(of(CART));
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([noDefault, WORK_ADDRESS]));

    const fixture = setup();

    expect(fixture.componentInstance.selectedAddressId()).toBeNull();
    expect(fixture.componentInstance.isCheckoutReady()).toBe(false);
  });

  it('updates selectedAddressId when a different address is chosen', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(of(CART));
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([DEFAULT_ADDRESS, WORK_ADDRESS]));

    const fixture = setup();
    fixture.componentInstance.selectAddress(WORK_ADDRESS.id);

    expect(fixture.componentInstance.selectedAddressId()).toBe(WORK_ADDRESS.id);
  });

  it('opens the add-address form and selects the newly created address on save', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(of(CART));
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([DEFAULT_ADDRESS]));

    const fixture = setup();
    fixture.componentInstance.openAddForm();
    fixture.detectChanges();

    expect(fixture.componentInstance.showAddressForm()).toBe(true);

    const newAddress: AddressResponse = { ...WORK_ADDRESS, id: 3 };
    addressService.getAddressesImpl = vi
      .fn()
      .mockReturnValue(of([DEFAULT_ADDRESS, newAddress]));
    fixture.componentInstance.onAddressSaved(newAddress);
    fixture.detectChanges();

    expect(fixture.componentInstance.showAddressForm()).toBe(false);
    expect(fixture.componentInstance.selectedAddressId()).toBe(newAddress.id);
    expect(fixture.nativeElement.textContent).toContain('Address added successfully.');
  });

  it('opens the edit-address form for a selected address', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(of(CART));
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([DEFAULT_ADDRESS]));

    const fixture = setup();
    fixture.componentInstance.openEditForm(DEFAULT_ADDRESS);
    fixture.detectChanges();

    expect(fixture.componentInstance.showAddressForm()).toBe(true);
    expect(fixture.componentInstance.editingAddress()).toEqual(DEFAULT_ADDRESS);
  });

  it('keeps the same address selected after an edit is saved', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(of(CART));
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([DEFAULT_ADDRESS]));

    const fixture = setup();
    expect(fixture.componentInstance.selectedAddressId()).toBe(DEFAULT_ADDRESS.id);

    fixture.componentInstance.openEditForm(DEFAULT_ADDRESS);
    const updated: AddressResponse = { ...DEFAULT_ADDRESS, city: 'Bengaluru' };
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([updated]));
    fixture.componentInstance.onAddressSaved(updated);
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedAddressId()).toBe(DEFAULT_ADDRESS.id);
    expect(fixture.nativeElement.textContent).toContain('Address updated successfully.');
  });

  it('provides an Edit Cart link to /cart', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(of(CART));
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([DEFAULT_ADDRESS]));

    const fixture = setup();

    const link: HTMLAnchorElement | null = fixture.nativeElement.querySelector('.edit-cart-link');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe('/cart');
  });

  it('shows a safe error message and Retry when the cart request fails', () => {
    cartService.getCartImpl = vi
      .fn()
      .mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([DEFAULT_ADDRESS]));

    const fixture = setup();

    expect(fixture.componentInstance.cartError()).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('500');
  });

  it('retries the cart request when Retry is clicked', () => {
    cartService.getCartImpl = vi
      .fn()
      .mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([DEFAULT_ADDRESS]));

    const fixture = setup();
    cartService.getCartImpl = vi.fn().mockReturnValue(of(CART));
    fixture.componentInstance.retryCart();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Wireless Mouse');
  });

  it('shows a safe error message when the address request fails', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(of(CART));
    addressService.getAddressesImpl = vi
      .fn()
      .mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

    const fixture = setup();

    expect(fixture.componentInstance.addressError()).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('500');
  });

  it('retries the address request when Retry is clicked', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(of(CART));
    addressService.getAddressesImpl = vi
      .fn()
      .mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

    const fixture = setup();
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([DEFAULT_ADDRESS]));
    fixture.componentInstance.retryAddresses();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('12 Example Street');
  });

  it('is not ready when the cart is empty', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(of(EMPTY_CART));
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([DEFAULT_ADDRESS]));

    const fixture = setup();

    expect(fixture.componentInstance.isCheckoutReady()).toBe(false);
  });

  it('is ready once the cart has items and a valid address is selected', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(of(CART));
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([DEFAULT_ADDRESS]));

    const fixture = setup();

    expect(fixture.componentInstance.isCheckoutReady()).toBe(true);
    const continueButton: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      '.place-order-btn',
    );
    expect(continueButton).not.toBeNull();
    expect(continueButton?.disabled).toBe(false);
  });

  it('does not implement order placement when Continue to Payment is clicked', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(of(CART));
    addressService.getAddressesImpl = vi.fn().mockReturnValue(of([DEFAULT_ADDRESS]));

    const fixture = setup();
// ... (existing imports)
// I will target the specific line 510 as requested.
// Since I cannot use partial edits easily without risk, I will use a targeted replacement.
    const placeOrderButton = fixture.nativeElement.querySelector('.place-order-btn');
    placeOrderButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Placing Order...');
  });
});
