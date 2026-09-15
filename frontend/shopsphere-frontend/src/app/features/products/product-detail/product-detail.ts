import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { ProductService } from '../../../core/services/product.service';
import { ProductResponse } from '../../../core/models/product.model';
import { resolveErrorMessage } from '../../../core/utils/http-error.util';

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

  readonly loading = signal(false);
  readonly invalidId = signal(false);
  readonly notFound = signal(false);
  readonly error = signal<string | null>(null);
  readonly product = signal<ProductResponse | null>(null);

  readonly inStock = computed(() => (this.product()?.stockQuantity ?? 0) > 0);

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
