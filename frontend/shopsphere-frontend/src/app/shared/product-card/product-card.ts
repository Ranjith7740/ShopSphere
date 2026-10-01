import { Component, computed, inject, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';

import { ProductResponse } from '../../core/models/product.model';
import { CartService } from '../../core/services/cart.service';
import { resolveErrorMessage } from '../../core/utils/http-error.util';
import { AuthService } from '../../core/services/auth.service';

const INSUFFICIENT_STOCK_MESSAGE = 'Not enough stock available.';

@Component({
  selector: 'app-product-card',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css',
})
export class ProductCard {
  private readonly cartService = inject(CartService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  readonly product = input.required<ProductResponse>();

  readonly inStock = computed(() => this.product().stockQuantity > 0);

  // null while available; otherwise the reason Add to Cart is disabled.
  readonly unavailableMessage = computed<string | null>(() => {
    if (this.product().status === 'INACTIVE') {
      return 'Product unavailable';
    }
    if (!this.inStock()) {
      return 'Out of stock';
    }
    return null;
  });

  readonly adding = signal(false);
  readonly added = signal(false);
  readonly addError = signal<string | null>(null);

  readonly addDisabled = computed(() => this.unavailableMessage() !== null || this.adding());

  // Bound to the button's (click) so the card's own routerLink navigation -
  // triggered by the same bubbling click reaching the wrapping <a> - never fires.
  addToCart(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.addDisabled()) {
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    this.adding.set(true);
    this.added.set(false);
    this.addError.set(null);

    this.cartService.addItem({ productId: this.product().id, quantity: 1 }).subscribe({
      next: () => {
        this.adding.set(false);
        this.added.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.adding.set(false);
        this.addError.set(resolveErrorMessage(err, { 409: INSUFFICIENT_STOCK_MESSAGE }));
      },
    });
  }
}
