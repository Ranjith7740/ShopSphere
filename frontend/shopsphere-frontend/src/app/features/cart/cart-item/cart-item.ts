import { Component, computed, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { CartItemResponse } from '../../../core/models/cart.model';

/**
 * Purely presentational cart row - no HTTP, no CartService. The parent
 * (CartComponent) owns every backend call; this component only reports what
 * the user asked for (a new quantity, or removal) and reflects whatever
 * operation state the parent tells it about.
 */
@Component({
  selector: 'app-cart-item',
  imports: [DecimalPipe],
  templateUrl: './cart-item.html',
  styleUrl: './cart-item.css',
})
export class CartItem {
  readonly item = input.required<CartItemResponse>();

  // Set by the parent while this item's own update/remove request is in flight.
  readonly updating = input(false);
  readonly removing = input(false);

  // Inline message from the parent (e.g. a 409 on the last update attempt).
  readonly errorMessage = input<string | null>(null);

  readonly quantityChange = output<number>();
  readonly remove = output<void>();

  readonly isInactive = computed(() => !this.item().productActive);
  readonly isOutOfStock = computed(() => this.item().availableStock === 0);
  readonly isOverStock = computed(() => this.item().quantity > this.item().availableStock);
  readonly isUnavailable = computed(() => this.isInactive() || this.isOutOfStock());

  private readonly busy = computed(() => this.updating() || this.removing());

  // Reducing quantity is always allowed (down to 1) even for an unavailable
  // item, so a customer can recover from an invalid quantity without having
  // to remove the item outright.
  readonly canDecrement = computed(() => !this.busy() && this.item().quantity > 1);

  readonly canIncrement = computed(
    () =>
      !this.busy() && !this.isUnavailable() && this.item().quantity < this.item().availableStock,
  );

  decrement(): void {
    if (!this.canDecrement()) {
      return;
    }
    this.quantityChange.emit(this.item().quantity - 1);
  }

  increment(): void {
    if (!this.canIncrement()) {
      return;
    }
    this.quantityChange.emit(this.item().quantity + 1);
  }

  onRemove(): void {
    if (this.removing()) {
      return;
    }
    this.remove.emit();
  }
}
