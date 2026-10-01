import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { CartItem } from './cart-item';
import { CartItemResponse } from '../../../core/models/cart.model';

const ITEM: CartItemResponse = {
  id: 10,
  productId: 1,
  productName: 'Wireless Mouse',
  quantity: 2,
  unitPrice: 29.99,
  subtotal: 59.98,
  availableStock: 120,
  productActive: true,
};

describe('CartItem', () => {
  function create(item: CartItemResponse, extraInputs: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(CartItem);
    fixture.componentRef.setInput('item', item);
    for (const [key, value] of Object.entries(extraInputs)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
    return fixture;
  }

  it('renders product name, unit price, quantity and subtotal', () => {
    const fixture = create(ITEM);

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Wireless Mouse');
    expect(text).toContain('29.99');
    expect(text).toContain('2');
    expect(text).toContain('59.98');
  });

  it('emits an incremented quantity when the increase button is clicked', () => {
    const fixture = create(ITEM);
    let emitted: number | undefined;
    fixture.componentInstance.quantityChange.subscribe((q: number) => (emitted = q));

    const increaseButton: HTMLButtonElement = fixture.nativeElement.querySelector(
      'button[aria-label="Increase quantity"]',
    );
    increaseButton.click();

    expect(emitted).toBe(3);
  });

  it('emits a decremented quantity when the decrease button is clicked', () => {
    const fixture = create(ITEM);
    let emitted: number | undefined;
    fixture.componentInstance.quantityChange.subscribe((q: number) => (emitted = q));

    const decreaseButton: HTMLButtonElement = fixture.nativeElement.querySelector(
      'button[aria-label="Decrease quantity"]',
    );
    decreaseButton.click();

    expect(emitted).toBe(1);
  });

  it('does not allow decrementing below quantity 1', () => {
    const fixture = create({ ...ITEM, quantity: 1 });
    const emit = vi.fn();
    fixture.componentInstance.quantityChange.subscribe(emit);

    const decreaseButton: HTMLButtonElement = fixture.nativeElement.querySelector(
      'button[aria-label="Decrease quantity"]',
    );
    expect(decreaseButton.disabled).toBe(true);

    decreaseButton.click();
    expect(emit).not.toHaveBeenCalled();
  });

  it('does not allow incrementing past available stock', () => {
    const fixture = create({ ...ITEM, quantity: 5, availableStock: 5 });
    const emit = vi.fn();
    fixture.componentInstance.quantityChange.subscribe(emit);

    const increaseButton: HTMLButtonElement = fixture.nativeElement.querySelector(
      'button[aria-label="Increase quantity"]',
    );
    expect(increaseButton.disabled).toBe(true);

    increaseButton.click();
    expect(emit).not.toHaveBeenCalled();
  });

  it('shows "Out of stock" and disables increment when availableStock is 0', () => {
    const fixture = create({ ...ITEM, availableStock: 0 });

    expect(fixture.nativeElement.textContent).toContain('Out of stock');
    const increaseButton: HTMLButtonElement = fixture.nativeElement.querySelector(
      'button[aria-label="Increase quantity"]',
    );
    expect(increaseButton.disabled).toBe(true);
  });

  it('shows "Product no longer available" when productActive is false', () => {
    const fixture = create({ ...ITEM, productActive: false });

    expect(fixture.nativeElement.textContent).toContain('Product no longer available');
  });

  it('shows a reduce-quantity warning when quantity exceeds available stock', () => {
    const fixture = create({ ...ITEM, quantity: 10, availableStock: 3 });

    expect(fixture.nativeElement.textContent).toContain('Only 3 left. Reduce quantity.');
  });

  it('still allows decrementing an unavailable item so the customer can reduce an invalid quantity', () => {
    const fixture = create({ ...ITEM, productActive: false, quantity: 3 });

    const decreaseButton: HTMLButtonElement = fixture.nativeElement.querySelector(
      'button[aria-label="Decrease quantity"]',
    );
    expect(decreaseButton.disabled).toBe(false);
  });

  it('emits remove when the Remove button is clicked', () => {
    const fixture = create(ITEM);
    const emit = vi.fn();
    fixture.componentInstance.remove.subscribe(emit);

    const removeButton: HTMLButtonElement = fixture.nativeElement.querySelector('.remove-button');
    removeButton.click();

    expect(emit).toHaveBeenCalledOnce();
  });

  it('exposes an accessible label for the remove button naming the product', () => {
    const fixture = create(ITEM);

    const removeButton: HTMLButtonElement = fixture.nativeElement.querySelector('.remove-button');
    expect(removeButton.getAttribute('aria-label')).toBe('Remove Wireless Mouse from cart');
  });

  it('does not perform HTTP requests (no HttpClient dependency)', () => {
    // CartItem has no CartService/HttpClient injected, so simply constructing
    // it without providing HttpClient must succeed.
    expect(() => create(ITEM)).not.toThrow();
  });
});
