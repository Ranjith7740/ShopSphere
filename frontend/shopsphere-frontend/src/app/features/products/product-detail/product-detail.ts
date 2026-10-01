import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { ProductService } from '../../../core/services/product.service';
import { ProductResponse } from '../../../core/models/product.model';
import { CartService } from '../../../core/services/cart.service';
import { resolveErrorMessage } from '../../../core/utils/http-error.util';

const INSUFFICIENT_STOCK_MESSAGE = 'Not enough stock available for the requested quantity.';

/**
 * Single product view, keyed entirely off the :productId route param. Kept
 * as one component with a handful of mutually-exclusive states (invalid id /
 * loading / not found / error / loaded) rather than child components, since
 * there's a single piece of content and no independently-reusable part of it.
 */
@Component({
  selector: 'app-product-detail',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly productService = inject(ProductService);
  private readonly cartService = inject(CartService);

  readonly loading = signal(false);
  readonly invalidId = signal(false);
  readonly notFound = signal(false);
  readonly error = signal<string | null>(null);
  readonly product = signal<ProductResponse | null>(null);

  readonly inStock = computed(() => (this.product()?.stockQuantity ?? 0) > 0);

  // null while the loaded product can be added to the cart; otherwise the
  // reason it can't - reused for both the quantity selector and the button.
  readonly unavailableMessage = computed<string | null>(() => {
    const product = this.product();
    if (!product) {
      return null;
    }
    if (product.status === 'INACTIVE') {
      return 'Product no longer available';
    }
    if (product.stockQuantity <= 0) {
      return 'Out of stock';
    }
    return null;
  });

  readonly quantity = signal(1);
  readonly addingToCart = signal(false);
  readonly added = signal(false);
  readonly addError = signal<string | null>(null);

  readonly canDecrementQuantity = computed(() => !this.addingToCart() && this.quantity() > 1);
  readonly canIncrementQuantity = computed(() => {
    const product = this.product();
    return (
      !!product &&
      !this.addingToCart() &&
      this.unavailableMessage() === null &&
      this.quantity() < product.stockQuantity
    );
  });
  readonly addToCartDisabled = computed(
    () => this.addingToCart() || this.unavailableMessage() !== null,
  );

  private productId: number | null = null;
  private paramSubscription: Subscription | undefined;

  ngOnInit(): void {
    this.paramSubscription = this.route.paramMap.subscribe((params) => {
      this.onRouteParamChange(params.get('productId'));
    });
  }

  ngOnDestroy(): void {
    this.paramSubscription?.unsubscribe();
  }

  retry(): void {
    this.loadProduct();
  }

  incrementQuantity(): void {
    if (!this.canIncrementQuantity()) {
      return;
    }
    this.quantity.update((q) => q + 1);
  }

  decrementQuantity(): void {
    if (!this.canDecrementQuantity()) {
      return;
    }
    this.quantity.update((q) => q - 1);
  }

  addToCart(): void {
    const product = this.product();
    if (!product || this.addToCartDisabled()) {
      return;
    }

    this.addingToCart.set(true);
    this.added.set(false);
    this.addError.set(null);

    this.cartService.addItem({ productId: product.id, quantity: this.quantity() }).subscribe({
      next: () => {
        this.addingToCart.set(false);
        this.added.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.addingToCart.set(false);
        this.addError.set(resolveErrorMessage(err, { 409: INSUFFICIENT_STOCK_MESSAGE }));
      },
    });
  }

  private onRouteParamChange(rawId: string | null): void {
    const id = this.parseProductId(rawId);

    if (id === null) {
      this.productId = null;
      this.invalidId.set(true);
      this.notFound.set(false);
      this.error.set(null);
      this.product.set(null);
      return;
    }

    this.invalidId.set(false);
    this.productId = id;
    this.loadProduct();
  }

  // Only a positive integer is a plausible product id - anything else (letters,
  // decimals, negative numbers, "0") is rejected client-side without ever
  // reaching the backend.
  private parseProductId(rawId: string | null): number | null {
    if (!rawId || !/^\d+$/.test(rawId)) {
      return null;
    }
    const value = Number(rawId);
    return value > 0 ? value : null;
  }

  private loadProduct(): void {
    const id = this.productId;
    if (id === null) {
      return;
    }

    this.loading.set(true);
    this.notFound.set(false);
    this.error.set(null);

    this.productService.getProductById(id).subscribe({
      next: (product) => {
        this.product.set(product);
        this.loading.set(false);
        this.quantity.set(1);
        this.added.set(false);
        this.addError.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.notFound.set(true);
        } else {
          this.error.set(resolveErrorMessage(err));
        }
      },
    });
  }
}
