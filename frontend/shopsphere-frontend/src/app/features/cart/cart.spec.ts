import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of, tap, throwError } from 'rxjs';
import { vi } from 'vitest';

import { Cart } from './cart';
import { CartService } from '../../core/services/cart.service';
import {
  AddCartItemRequest,
  CartResponse,
  UpdateCartItemRequest,
} from '../../core/models/cart.model';

/**
 * Mirrors CartService's real tap-based signal update exactly, but lets each
 * test control the underlying observable per call (success, error, or a
 * Subject to control timing). This makes it possible to assert that the
 * shared cart signal only ever changes on a successful backend response -
 * exactly like production - without re-implementing HTTP.
 */
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
    {
      id: 11,
      productId: 2,
      productName: 'Mechanical Keyboard',
      quantity: 1,
      unitPrice: 89.0,
      subtotal: 89.0,
      availableStock: 5,
      productActive: true,
    },
  ],
  cartTotal: 148.98,
};

const EMPTY_CART: CartResponse = { cartId: 1, items: [], cartTotal: 0 };

describe('Cart', () => {
  let cartService: FakeCartService;

  // Tests configure cartService.<method>Impl BEFORE calling setup(), since
  // setup() triggers ngOnInit (via detectChanges) immediately. cartService
  // is created fresh in beforeEach, ahead of any per-test configuration.
  beforeEach(() => {
    cartService = new FakeCartService();
  });

  function setup() {
    TestBed.configureTestingModule({
      imports: [Cart],
      providers: [provideRouter([]), { provide: CartService, useValue: cartService }],
    });

    const fixture = TestBed.createComponent(Cart);
    fixture.detectChanges();
    return fixture;
  }

  it('shows a loading state while the initial cart request is in flight', () => {
    const subject = new Subject<CartResponse>();
    const fixture = setup();
    cartService.getCartImpl = vi.fn().mockReturnValue(subject.asObservable());
    fixture.componentInstance.retry();
    fixture.detectChanges();

    expect(fixture.componentInstance.loading()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Loading cart...');

    subject.next(CART);
    subject.complete();
  });

  it('loads and renders cart items on success', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(of(CART));
    const fixture = setup();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Wireless Mouse');
    expect(text).toContain('Mechanical Keyboard');
  });

  it('shows the empty-cart state when the cart has no items', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(of(EMPTY_CART));
    const fixture = setup();

    expect(fixture.nativeElement.textContent).toContain('Your cart is empty');
  });

  it('provides a Continue Shopping link to /products from the empty state', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(of(EMPTY_CART));
    const fixture = setup();

    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a');
    expect(link.getAttribute('href')).toBe('/products');
  });

  it('provides a Continue Shopping link to /products from the normal cart view', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(of(CART));
    const fixture = setup();

    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a.back-link');
    expect(link.getAttribute('href')).toBe('/products');
  });

  it('shows a safe error message and Retry on a failed initial load', () => {
    cartService.getCartImpl = vi
      .fn()
      .mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    const fixture = setup();

    expect(fixture.componentInstance.error()).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('500');
    const retryButton: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(retryButton.textContent).toContain('Retry');
  });

  it('calls getCart again when Retry is clicked', () => {
    cartService.getCartImpl = vi
      .fn()
      .mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    const fixture = setup();

    cartService.getCartImpl = vi.fn().mockReturnValue(of(CART));
    fixture.componentInstance.retry();
    fixture.detectChanges();

    expect(cartService.getCartImpl).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Wireless Mouse');
  });

  it('displays the backend-provided cartTotal', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(of(CART));
    const fixture = setup();

    expect(fixture.nativeElement.textContent).toContain('148.98');
  });

  it('does not recalculate cartTotal from item subtotals', () => {
    // Visible item subtotals sum to 148.98, but a backend that excludes an
    // unavailable item's subtotal returns a smaller cartTotal (59.98) - the
    // component must show that smaller figure verbatim, never the naive
    // sum of the two rendered subtotals.
    const cartWithExcludedItem: CartResponse = {
      cartId: 1,
      items: [{ ...CART.items[0] }, { ...CART.items[1], productActive: false, subtotal: 89.0 }],
      cartTotal: 59.98,
    };
    cartService.getCartImpl = vi.fn().mockReturnValue(of(cartWithExcludedItem));
    const fixture = setup();

    const totalLine = fixture.nativeElement.querySelector('.cart-total').textContent;
    expect(totalLine).toContain('59.98');
    expect(totalLine).not.toContain('148.98');
  });

  it('calls updateItem with the correct id and quantity on increase', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(of(CART));
    const fixture = setup();
    cartService.updateItemImpl = vi.fn().mockReturnValue(of(CART));

    fixture.componentInstance.onQuantityChange(10, 3);

    expect(cartService.updateItemImpl).toHaveBeenCalledWith(10, { quantity: 3 });
  });

  it('calls updateItem with the correct id and quantity on decrease', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(of(CART));
    const fixture = setup();
    cartService.updateItemImpl = vi.fn().mockReturnValue(of(CART));

    fixture.componentInstance.onQuantityChange(10, 1);

    expect(cartService.updateItemImpl).toHaveBeenCalledWith(10, { quantity: 1 });
  });

  it('does not mutate the displayed cart when a quantity update fails', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(of(CART));
    const fixture = setup();
    cartService.updateItemImpl = vi.fn().mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { message: 'Requested quantity 50 exceeds available stock of 5' },
          }),
      ),
    );

    fixture.componentInstance.onQuantityChange(10, 50);
    fixture.detectChanges();

    expect(fixture.componentInstance.cart()).toEqual(CART);
  });

  it('shows a friendly insufficient-stock message without raw backend details on 409', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(of(CART));
    const fixture = setup();
    cartService.updateItemImpl = vi.fn().mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: {
              message: 'Requested quantity 50 for product id 1 exceeds available stock of 5',
            },
          }),
      ),
    );

    fixture.componentInstance.onQuantityChange(10, 50);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).not.toContain('for product id 1');
    expect(fixture.componentInstance.itemError(10)).toBeTruthy();
  });

  it('calls removeItem with the correct cartItemId', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(of(CART));
    const fixture = setup();
    cartService.removeItemImpl = vi.fn().mockReturnValue(of(EMPTY_CART));

    fixture.componentInstance.onRemove(10);

    expect(cartService.removeItemImpl).toHaveBeenCalledWith(10);
  });

  it('does not mutate the displayed cart when remove fails', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(of(CART));
    const fixture = setup();
    cartService.removeItemImpl = vi
      .fn()
      .mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

    fixture.componentInstance.onRemove(10);
    fixture.detectChanges();

    expect(fixture.componentInstance.cart()).toEqual(CART);
  });

  it('calls clearCart when Clear Cart is clicked', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(of(CART));
    const fixture = setup();
    cartService.clearCartImpl = vi.fn().mockReturnValue(of(EMPTY_CART));

    fixture.componentInstance.onClearCart();

    expect(cartService.clearCartImpl).toHaveBeenCalled();
  });

  it('does not mutate the displayed cart when clearCart fails', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(of(CART));
    const fixture = setup();
    cartService.clearCartImpl = vi
      .fn()
      .mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

    fixture.componentInstance.onClearCart();
    fixture.detectChanges();

    expect(fixture.componentInstance.cart()).toEqual(CART);
    expect(fixture.componentInstance.clearError()).toBeTruthy();
  });

  it('prevents a duplicate quantity update for the same item while one is in flight', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(of(CART));
    const fixture = setup();
    const subject = new Subject<CartResponse>();
    cartService.updateItemImpl = vi.fn().mockReturnValue(subject.asObservable());

    fixture.componentInstance.onQuantityChange(10, 3);
    fixture.componentInstance.onQuantityChange(10, 4);

    expect(cartService.updateItemImpl).toHaveBeenCalledTimes(1);
    subject.next(CART);
    subject.complete();
  });

  it('prevents a duplicate remove for the same item while one is in flight', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(of(CART));
    const fixture = setup();
    const subject = new Subject<CartResponse>();
    cartService.removeItemImpl = vi.fn().mockReturnValue(subject.asObservable());

    fixture.componentInstance.onRemove(10);
    fixture.componentInstance.onRemove(10);

    expect(cartService.removeItemImpl).toHaveBeenCalledTimes(1);
    subject.next(EMPTY_CART);
    subject.complete();
  });

  it('prevents a duplicate clear-cart request while one is in flight', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(of(CART));
    const fixture = setup();
    const subject = new Subject<CartResponse>();
    cartService.clearCartImpl = vi.fn().mockReturnValue(subject.asObservable());

    fixture.componentInstance.onClearCart();
    fixture.componentInstance.onClearCart();

    expect(cartService.clearCartImpl).toHaveBeenCalledTimes(1);
    subject.next(EMPTY_CART);
    subject.complete();
  });

  it('does not block updating one item while another item is being removed', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(of(CART));
    const fixture = setup();
    const removeSubject = new Subject<CartResponse>();
    cartService.removeItemImpl = vi.fn().mockReturnValue(removeSubject.asObservable());
    cartService.updateItemImpl = vi.fn().mockReturnValue(of(CART));

    fixture.componentInstance.onRemove(10);
    fixture.componentInstance.onQuantityChange(11, 2);

    expect(cartService.updateItemImpl).toHaveBeenCalledWith(11, { quantity: 2 });
    removeSubject.next(CART);
    removeSubject.complete();
  });

  it('visibly marks an out-of-stock item', () => {
    const cartWithOutOfStock: CartResponse = {
      ...CART,
      items: [{ ...CART.items[0], availableStock: 0 }, CART.items[1]],
    };
    cartService.getCartImpl = vi.fn().mockReturnValue(of(cartWithOutOfStock));
    const fixture = setup();

    expect(fixture.nativeElement.textContent).toContain('Out of stock');
  });

  it('visibly marks an inactive product', () => {
    const cartWithInactive: CartResponse = {
      ...CART,
      items: [{ ...CART.items[0], productActive: false }, CART.items[1]],
    };
    cartService.getCartImpl = vi.fn().mockReturnValue(of(cartWithInactive));
    const fixture = setup();

    expect(fixture.nativeElement.textContent).toContain('Product no longer available');
  });

  it('shows a warning when an item quantity exceeds available stock', () => {
    const cartOverStock: CartResponse = {
      ...CART,
      items: [{ ...CART.items[0], quantity: 10, availableStock: 3 }, CART.items[1]],
    };
    cartService.getCartImpl = vi.fn().mockReturnValue(of(cartOverStock));
    const fixture = setup();

    expect(fixture.nativeElement.textContent).toContain('Only 3 left. Reduce quantity.');
  });

  it('still allows removing an unavailable item', () => {
    const cartWithInactive: CartResponse = {
      ...CART,
      items: [{ ...CART.items[0], productActive: false }, CART.items[1]],
    };
    cartService.getCartImpl = vi.fn().mockReturnValue(of(cartWithInactive));
    const fixture = setup();
    cartService.removeItemImpl = vi.fn().mockReturnValue(of(EMPTY_CART));

    const removeButtons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.remove-button'),
    );
    expect(removeButtons[0].disabled).toBe(false);
    removeButtons[0].click();

    expect(cartService.removeItemImpl).toHaveBeenCalledWith(10);
  });

  it('renders accessible labels for quantity controls and remove actions', () => {
    cartService.getCartImpl = vi.fn().mockReturnValue(of(CART));
    const fixture = setup();

    expect(
      fixture.nativeElement.querySelector('button[aria-label="Increase quantity"]'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('button[aria-label="Decrease quantity"]'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('button[aria-label="Remove Wireless Mouse from cart"]'),
    ).toBeTruthy();
  });
});
