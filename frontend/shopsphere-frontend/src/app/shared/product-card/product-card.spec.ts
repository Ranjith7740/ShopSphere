import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ProductCard } from './product-card';
import { ProductResponse } from '../../core/models/product.model';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { CartResponse } from '../../core/models/cart.model';

const PRODUCT: ProductResponse = {
  id: 7,
  categoryId: 3,
  categoryName: 'Electronics',
  name: 'Wireless Mouse',
  description: 'Ergonomic wireless mouse',
  price: 29.99,
  stockQuantity: 120,
  status: 'ACTIVE',
  createdAt: '2026-01-10T12:00:00',
  updatedAt: '2026-01-10T12:00:00',
};

const CART_RESPONSE: CartResponse = {
  cartId: 1,
  items: [
    {
      id: 1,
      productId: 7,
      productName: 'Wireless Mouse',
      quantity: 1,
      unitPrice: 29.99,
      subtotal: 29.99,
      availableStock: 120,
      productActive: true,
    },
  ],
  cartTotal: 29.99,
};

describe('ProductCard', () => {
  let cartServiceMock: { addItem: ReturnType<typeof vi.fn> };
  let authServiceMock: { isAuthenticated: ReturnType<typeof signal<boolean>> };

  beforeEach(() => {
    cartServiceMock = { addItem: vi.fn().mockReturnValue(of(CART_RESPONSE)) };
    authServiceMock = { isAuthenticated: signal(true) };

    TestBed.configureTestingModule({
      imports: [ProductCard],
      providers: [
        // A real 'login' route so the unauthenticated-redirect tests' call to
        // router.navigate(['/login']) resolves instead of rejecting with
        // NG04002 (no matching route).
        provideRouter([{ path: 'login', children: [] }]),
        { provide: CartService, useValue: cartServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    });
  });

  function create(product: ProductResponse = PRODUCT) {
    const fixture = TestBed.createComponent(ProductCard);
    fixture.componentRef.setInput('product', product);
    fixture.detectChanges();
    return fixture;
  }

  it('displays the product name, category, price and description', () => {
    const fixture = create();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Wireless Mouse');
    expect(text).toContain('Electronics');
    expect(text).toContain('29.99');
    expect(text).toContain('Ergonomic wireless mouse');
  });

  it('shows "In Stock" when stockQuantity is greater than zero', () => {
    const fixture = create();

    expect(fixture.nativeElement.textContent).toContain('In Stock');
  });

  it('shows "Out of Stock" when stockQuantity is zero', () => {
    const fixture = create({ ...PRODUCT, stockQuantity: 0 });

    expect(fixture.nativeElement.textContent).toContain('Out of Stock');
  });

  it('links to the product detail route', () => {
    const fixture = create();

    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a');
    expect(link.getAttribute('href')).toBe('/products/7');
  });

  it('renders an Add to Cart button', () => {
    const fixture = create();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.add-to-cart-button');
    expect(button).toBeTruthy();
    expect(button.textContent).toContain('Add to Cart');
  });

  it('calls CartService.addItem with productId and quantity 1 when clicked', () => {
    const fixture = create();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.add-to-cart-button');
    button.click();

    expect(cartServiceMock.addItem).toHaveBeenCalledWith({ productId: 7, quantity: 1 });
  });

  it('shows a loading state while the add request is in flight', () => {
    const subject = new Subject<CartResponse>();
    cartServiceMock.addItem.mockReturnValue(subject.asObservable());
    const fixture = create();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.add-to-cart-button');
    button.click();
    fixture.detectChanges();

    expect(button.textContent).toContain('Adding...');
    expect(button.disabled).toBe(true);

    subject.next(CART_RESPONSE);
    subject.complete();
  });

  it('prevents duplicate add requests while one is already in flight', () => {
    const subject = new Subject<CartResponse>();
    cartServiceMock.addItem.mockReturnValue(subject.asObservable());
    const fixture = create();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.add-to-cart-button');
    button.click();
    fixture.detectChanges();
    button.click();

    expect(cartServiceMock.addItem).toHaveBeenCalledTimes(1);

    subject.next(CART_RESPONSE);
    subject.complete();
  });

  it('disables Add to Cart and shows a message for an inactive product', () => {
    const fixture = create({ ...PRODUCT, status: 'INACTIVE' });

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.add-to-cart-button');
    expect(button.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Product unavailable');
  });

  it('disables Add to Cart and shows a message for an out-of-stock product', () => {
    const fixture = create({ ...PRODUCT, stockQuantity: 0 });

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.add-to-cart-button');
    expect(button.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Out of stock');
  });

  it('shows success feedback after a successful add', () => {
    const fixture = create();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.add-to-cart-button');
    button.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Added to cart');
  });

  it('shows a safe error message on a generic failure without exposing raw details', () => {
    cartServiceMock.addItem.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    const fixture = create();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.add-to-cart-button');
    button.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('500');
    expect(fixture.nativeElement.querySelector('.add-error')).toBeTruthy();
  });

  it('shows a stock-related message on a 409 conflict', () => {
    cartServiceMock.addItem.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: {
              message: 'Requested quantity 1 for product id 7 exceeds available stock of 0',
            },
          }),
      ),
    );
    const fixture = create();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.add-to-cart-button');
    button.click();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Not enough stock available.');
    expect(text).not.toContain('for product id 7');
  });

  it('does not navigate to the product detail page when Add to Cart is clicked', () => {
    const fixture = create();
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');
    const stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation');

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.add-to-cart-button');
    button.dispatchEvent(clickEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(stopPropagationSpy).toHaveBeenCalled();
  });

  it('still links to the product detail route alongside the Add to Cart button', () => {
    const fixture = create();

    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a.product-card');
    expect(link.getAttribute('href')).toBe('/products/7');
  });

  describe('when the user is not authenticated', () => {
    beforeEach(() => {
      authServiceMock.isAuthenticated.set(false);
    });

    it('redirects to /login instead of calling CartService.addItem', () => {
      const fixture = create();
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate');

      const button: HTMLButtonElement = fixture.nativeElement.querySelector('.add-to-cart-button');
      button.click();

      expect(cartServiceMock.addItem).not.toHaveBeenCalled();
      expect(navigateSpy).toHaveBeenCalledWith(['/login'], {
        queryParams: { returnUrl: router.url },
      });
    });

    it('does not show an "Adding..." state or any cart feedback', () => {
      const fixture = create();

      const button: HTMLButtonElement = fixture.nativeElement.querySelector('.add-to-cart-button');
      button.click();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).not.toContain('Adding...');
      expect(fixture.nativeElement.querySelector('.add-success')).toBeNull();
    });
  });
});
