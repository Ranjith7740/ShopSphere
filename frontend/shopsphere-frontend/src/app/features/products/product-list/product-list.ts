import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { ProductService } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { ProductQueryParams, ProductResponse } from '../../../core/models/product.model';
import { CategoryResponse } from '../../../core/models/category.model';
import { resolveErrorMessage } from '../../../core/utils/http-error.util';
import { ProductCard } from '../../../shared/product-card/product-card';
import { Pagination } from '../../../shared/pagination/pagination';

interface SortOption {
  readonly value: string;
  readonly label: string;
}

// "" means "use the backend's own default order" (createdAt,desc) - kept distinct from
// the literal string so a completely untouched filter bar sends zero query params,
// matching every other filter's "empty means not applied" convention.
const SORT_OPTIONS: readonly SortOption[] = [
  { value: '', label: 'Newest' },
  { value: 'createdAt,asc', label: 'Oldest' },
  { value: 'price,asc', label: 'Price: Low to High' },
  { value: 'price,desc', label: 'Price: High to Low' },
  { value: 'name,asc', label: 'Name: A to Z' },
  { value: 'name,desc', label: 'Name: Z to A' },
];

const SEARCH_AND_PRICE_DEBOUNCE_MS = 400;

// Matches the backend's own default (ProductService.MAX_PAGE_SIZE=100, default size=10).
// No page-size selector for now - keeping the filter bar simple - but the value stays
// centralized here rather than a magic number scattered across the component.
const DEFAULT_PAGE_SIZE = 10;

/**
 * First page of the public catalog, filtered/sorted entirely server-side -
 * every control here just rebuilds a ProductQueryParams and re-calls
 * ProductService.getProducts(); nothing is filtered locally. Category/sort
 * changes apply immediately (they're discrete choices); search and price
 * typing are debounced so each keystroke doesn't fire a request.
 */
@Component({
  selector: 'app-product-list',
  imports: [ProductCard, Pagination],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductList implements OnInit, OnDestroy {
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);

  readonly sortOptions = SORT_OPTIONS;

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly products = signal<ProductResponse[]>([]);
  readonly categories = signal<CategoryResponse[]>([]);

  // Zero-based, matching the backend's Pageable convention end-to-end.
  readonly page = signal(0);
  readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  readonly totalElements = signal(0);
  readonly totalPages = signal(0);

  readonly searchInput = signal('');
  readonly categoryId = signal('');
  readonly minPriceInput = signal('');
  readonly maxPriceInput = signal('');
  readonly sort = signal('');

  readonly priceValidationMessage = computed<string | null>(() => {
    const minRaw = this.minPriceInput().trim();
    const maxRaw = this.maxPriceInput().trim();
    const min = this.parsePrice(minRaw);
    const max = this.parsePrice(maxRaw);

    if (minRaw !== '' && (min === null || min < 0)) {
      return 'Minimum price must be a valid non-negative number.';
    }
    if (maxRaw !== '' && (max === null || max < 0)) {
      return 'Maximum price must be a valid non-negative number.';
    }
    if (min !== null && max !== null && min > max) {
      return 'Minimum price must not be greater than maximum price.';
    }
    return null;
  });

  private debounceHandle: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
  }

  ngOnDestroy(): void {
    this.clearDebounce();
  }

  onSearchInput(value: string): void {
    this.searchInput.set(value);
    this.scheduleDebouncedApply();
  }

  onMinPriceInput(value: string): void {
    this.minPriceInput.set(value);
    this.scheduleDebouncedApply();
  }

  onMaxPriceInput(value: string): void {
    this.maxPriceInput.set(value);
    this.scheduleDebouncedApply();
  }

  onCategoryChange(value: string): void {
    this.categoryId.set(value);
    this.clearDebounce();
    this.applyFilters();
  }

  onSortChange(value: string): void {
    this.sort.set(value);
    this.clearDebounce();
    this.applyFilters();
  }

  resetFilters(): void {
    this.clearDebounce();
    this.searchInput.set('');
    this.categoryId.set('');
    this.minPriceInput.set('');
    this.maxPriceInput.set('');
    this.sort.set('');
    this.applyFilters();
  }

  retry(): void {
    // Retries whatever was last requested - current page AND current filters -
    // never resets to page 0, unlike a genuine filter change.
    this.loadProducts();
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages() || page === this.page()) {
      return;
    }
    this.page.set(page);
    this.loadProducts();
  }

  // The single funnel for every filter-changing action (search/price debounce
  // firing, category/sort change, reset). Always drops back to the first page,
  // per the "changing a filter restarts pagination" requirement - pure page
  // navigation goes through goToPage() instead, which never resets filters.
  private applyFilters(): void {
    if (this.priceValidationMessage()) {
      return;
    }
    this.page.set(0);
    this.loadProducts();
  }

  private loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.categories.set([]),
    });
  }

  private loadProducts(): void {
    this.loading.set(true);
    this.error.set(null);

    this.productService.getProducts(this.buildParams()).subscribe({
      next: (pageResponse) => {
        this.products.set(pageResponse.data);
        this.totalElements.set(pageResponse.totalElements);
        this.totalPages.set(pageResponse.totalPages);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(resolveErrorMessage(err));
        this.loading.set(false);
      },
    });
  }

  private buildParams(): ProductQueryParams {
    const params: ProductQueryParams = {
      page: this.page(),
      size: this.pageSize(),
    };

    const search = this.searchInput().trim();
    if (search) {
      params.search = search;
    }
    if (this.categoryId()) {
      params.categoryId = Number(this.categoryId());
    }

    const minPrice = this.parsePrice(this.minPriceInput());
    if (minPrice !== null) {
      params.minPrice = minPrice;
    }
    const maxPrice = this.parsePrice(this.maxPriceInput());
    if (maxPrice !== null) {
      params.maxPrice = maxPrice;
    }

    if (this.sort()) {
      params.sort = this.sort();
    }

    return params;
  }

  private parsePrice(raw: string): number | null {
    const trimmed = raw.trim();
    if (trimmed === '') {
      return null;
    }
    const value = Number(trimmed);
    return Number.isFinite(value) ? value : null;
  }

  private scheduleDebouncedApply(): void {
    this.clearDebounce();
    this.debounceHandle = setTimeout(() => this.applyFilters(), SEARCH_AND_PRICE_DEBOUNCE_MS);
  }

  private clearDebounce(): void {
    if (this.debounceHandle !== undefined) {
      clearTimeout(this.debounceHandle);
      this.debounceHandle = undefined;
    }
  }
}
