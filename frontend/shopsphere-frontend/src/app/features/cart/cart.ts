import { Component, OnInit, WritableSignal, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { CartService } from '../../core/services/cart.service';
import { resolveErrorMessage } from '../../core/utils/http-error.util';
import { CartItem } from './cart-item/cart-item';

const INSUFFICIENT_STOCK_MESSAGE = 'Not enough stock available for the requested quantity.';

/**
 * Orchestrates the Cart page. All backend calls go through CartService;
 * the cart itself is read straight from CartService.cart() rather than
 * copied into a local signal, so this component and any future sibling
 * (e.g. a nav badge) always see the same authoritative state. Only
 * operation-specific state (initial load, per-item update/remove,
 * clear-cart) lives here.
 */
@Component({
  selector: 'app-cart',
  imports: [CartItem, RouterLink, DecimalPipe],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class Cart implements OnInit {
  private readonly cartService = inject(CartService);

  readonly cart = this.cartService.cart;

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly updatingItemIds = signal<ReadonlySet<number>>(new Set());
  readonly removingItemIds = signal<ReadonlySet<number>>(new Set());
  readonly itemErrors = signal<ReadonlyMap<number, string>>(new Map());

  readonly clearing = signal(false);
  readonly clearError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadCart();
  }

  retry(): void {
    this.loadCart();
  }

  isUpdating(cartItemId: number): boolean {
    return this.updatingItemIds().has(cartItemId);
  }

  isRemoving(cartItemId: number): boolean {
    return this.removingItemIds().has(cartItemId);
  }

  itemError(cartItemId: number): string | null {
    return this.itemErrors().get(cartItemId) ?? null;
  }

  onQuantityChange(cartItemId: number, quantity: number): void {
    if (this.isUpdating(cartItemId)) {
      return;
    }

    this.clearItemError(cartItemId);
    this.addTo(this.updatingItemIds, cartItemId);

    this.cartService.updateItem(cartItemId, { quantity }).subscribe({
      next: () => this.removeFrom(this.updatingItemIds, cartItemId),
      error: (err: HttpErrorResponse) => {
        this.removeFrom(this.updatingItemIds, cartItemId);
        this.setItemError(
          cartItemId,
          resolveErrorMessage(err, { 409: INSUFFICIENT_STOCK_MESSAGE }),
        );
      },
    });
  }

  onRemove(cartItemId: number): void {
    if (this.isRemoving(cartItemId)) {
      return;
    }

    this.clearItemError(cartItemId);
    this.addTo(this.removingItemIds, cartItemId);

    this.cartService.removeItem(cartItemId).subscribe({
      next: () => this.removeFrom(this.removingItemIds, cartItemId),
      error: (err: HttpErrorResponse) => {
        this.removeFrom(this.removingItemIds, cartItemId);
        this.setItemError(cartItemId, resolveErrorMessage(err));
      },
    });
  }

  onClearCart(): void {
    if (this.clearing()) {
      return;
    }

    this.clearing.set(true);
    this.clearError.set(null);

    this.cartService.clearCart().subscribe({
      next: () => this.clearing.set(false),
      error: (err: HttpErrorResponse) => {
        this.clearing.set(false);
        this.clearError.set(resolveErrorMessage(err));
      },
    });
  }

  private loadCart(): void {
    this.loading.set(true);
    this.error.set(null);

    this.cartService.getCart().subscribe({
      next: () => this.loading.set(false),
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(resolveErrorMessage(err));
      },
    });
  }

  private addTo(target: WritableSignal<ReadonlySet<number>>, id: number): void {
    const next = new Set(target());
    next.add(id);
    target.set(next);
  }

  private removeFrom(target: WritableSignal<ReadonlySet<number>>, id: number): void {
    const next = new Set(target());
    next.delete(id);
    target.set(next);
  }

  private setItemError(cartItemId: number, message: string): void {
    const next = new Map(this.itemErrors());
    next.set(cartItemId, message);
    this.itemErrors.set(next);
  }

  private clearItemError(cartItemId: number): void {
    if (!this.itemErrors().has(cartItemId)) {
      return;
    }
    const next = new Map(this.itemErrors());
    next.delete(cartItemId);
    this.itemErrors.set(next);
  }
}
