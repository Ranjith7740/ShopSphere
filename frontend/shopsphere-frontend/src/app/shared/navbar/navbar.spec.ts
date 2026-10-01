import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { provideRouter } from '@angular/router';

import { Navbar } from './navbar';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { CartResponse } from '../../core/models/cart.model';

const CART_WITH_ITEMS: CartResponse = {
  cartId: 1,
  items: [
    {
      id: 1,
      productId: 1,
      productName: 'Wireless Mouse',
      quantity: 2,
      unitPrice: 29.99,
      subtotal: 59.98,
      availableStock: 120,
      productActive: true,
    },
    {
      id: 2,
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

describe('Navbar', () => {
  let fixture: ComponentFixture<Navbar>;
  let cartSignal: WritableSignal<CartResponse | null>;

  function create() {
    fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(async () => {
    cartSignal = signal<CartResponse | null>(null);

    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { isAuthenticated: signal(true), currentUser: signal(null) },
        },
        { provide: CartService, useValue: { cart: cartSignal } },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    create();
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('cart badge', () => {
    it('shows no badge while the cart has not been loaded (cart() is null)', () => {
      create();

      expect(fixture.componentInstance.cartItemCount()).toBeNull();
      expect(fixture.nativeElement.querySelector('.cart-badge')).toBeNull();
    });

    it('derives the badge from the total item quantity, not the number of distinct products', () => {
      cartSignal.set(CART_WITH_ITEMS);
      create();

      // 2 distinct products, but quantities 2 + 1 = 3 total units.
      expect(fixture.componentInstance.cartItemCount()).toBe(3);
      const badge = fixture.nativeElement.querySelector('.cart-badge');
      expect(badge.textContent.trim()).toBe('3');
    });

    it('shows no badge for an empty but loaded cart', () => {
      cartSignal.set(EMPTY_CART);
      create();

      expect(fixture.componentInstance.cartItemCount()).toBe(0);
      expect(fixture.nativeElement.querySelector('.cart-badge')).toBeNull();
    });

    it('updates automatically when the shared cart signal changes, without a separate count signal', () => {
      create();
      expect(fixture.nativeElement.querySelector('.cart-badge')).toBeNull();

      cartSignal.set(CART_WITH_ITEMS);
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.cart-badge');
      expect(badge.textContent.trim()).toBe('3');
    });
  });
});
