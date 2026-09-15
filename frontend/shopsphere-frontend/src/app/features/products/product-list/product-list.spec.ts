import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ProductList } from './product-list';
import { ProductService } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { ProductPageResponse, ProductResponse } from '../../../core/models/product.model';
import { CategoryResponse } from '../../../core/models/category.model';

const PRODUCT: ProductResponse = {
  id: 1,
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

function page(overrides: Partial<ProductPageResponse> = {}): ProductPageResponse {
  return {
    data: [PRODUCT],
    page: 0,
    size: 10,
    totalElements: 1,
    totalPages: 1,
    ...overrides,
  };
}

const CATEGORIES: CategoryResponse[] = [
  {
    id: 3,
    name: 'Electronics',
    description: 'Electronic devices',
    status: 'ACTIVE',
    createdAt: '2026-01-10T12:00:00',
    updatedAt: '2026-01-10T12:00:00',
  },
  {
    id: 5,
    name: 'Books',
    description: 'Books and media',
    status: 'ACTIVE',
    createdAt: '2026-01-10T12:00:00',
    updatedAt: '2026-01-10T12:00:00',
  },
];

describe('ProductList', () => {
  let productServiceMock: { getProducts: ReturnType<typeof vi.fn> };
  let categoryServiceMock: { getCategories: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    productServiceMock = { getProducts: vi.fn().mockReturnValue(of(page())) };
    categoryServiceMock = { getCategories: vi.fn().mockReturnValue(of(CATEGORIES)) };

    TestBed.configureTestingModule({
      imports: [ProductList],
      providers: [
        provideRouter([]),
        { provide: ProductService, useValue: productServiceMock },
        { provide: CategoryService, useValue: categoryServiceMock },
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function create() {
    const fixture = TestBed.createComponent(ProductList);
    fixture.detectChanges();
    return fixture;
  }

  it('loads products and categories on init, requesting page 0', () => {
    create();

    expect(productServiceMock.getProducts).toHaveBeenCalledWith({ page: 0, size: 10 });
    expect(categoryServiceMock.getCategories).toHaveBeenCalled();
  });

  it('stores the backend pagination metadata from the response', () => {
    productServiceMock.getProducts.mockReturnValue(
      of(page({ page: 0, size: 10, totalElements: 42, totalPages: 5 })),
    );
    const fixture = create();

    expect(fixture.componentInstance.totalElements()).toBe(42);
    expect(fixture.componentInstance.totalPages()).toBe(5);
  });

  it('displays the loaded categories in the dropdown, plus "All Categories"', () => {
    const fixture = create();

    const options: HTMLOptionElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('#categoryId option'),
    );
    expect(options.map((o) => o.textContent?.trim())).toEqual([
      'All Categories',
      'Electronics',
      'Books',
    ]);
  });

  it('shows the loaded products', () => {
    const fixture = create();

    expect(fixture.componentInstance.products()).toEqual([PRODUCT]);
    expect(fixture.nativeElement.textContent).toContain('Wireless Mouse');
  });

  it('hides pagination controls when totalPages is 0 or 1', () => {
    const fixture = create();

    expect(fixture.nativeElement.querySelector('app-pagination')).toBeNull();
  });

  it('shows pagination controls when there is more than one page', () => {
    productServiceMock.getProducts.mockReturnValue(of(page({ totalPages: 3 })));
    const fixture = create();

    expect(fixture.nativeElement.querySelector('app-pagination')).not.toBeNull();
  });

  it('debounces search input and sends the search parameter once typing settles', () => {
    vi.useFakeTimers();
    const fixture = create();
    productServiceMock.getProducts.mockClear();

    fixture.componentInstance.onSearchInput('m');
    fixture.componentInstance.onSearchInput('mo');
    fixture.componentInstance.onSearchInput('mouse');

    expect(productServiceMock.getProducts).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);

    expect(productServiceMock.getProducts).toHaveBeenCalledTimes(1);
    expect(productServiceMock.getProducts).toHaveBeenCalledWith({
      search: 'mouse',
      page: 0,
      size: 10,
    });
  });

  it('does not send a search parameter for a blank/whitespace-only search', () => {
    vi.useFakeTimers();
    const fixture = create();
    productServiceMock.getProducts.mockClear();

    fixture.componentInstance.onSearchInput('   ');
    vi.advanceTimersByTime(400);

    expect(productServiceMock.getProducts).toHaveBeenCalledWith({ page: 0, size: 10 });
  });

  it('sends categoryId immediately when a category is selected', () => {
    const fixture = create();
    productServiceMock.getProducts.mockClear();

    fixture.componentInstance.onCategoryChange('3');

    expect(productServiceMock.getProducts).toHaveBeenCalledWith({
      categoryId: 3,
      page: 0,
      size: 10,
    });
  });

  it('sends minPrice and maxPrice once typing settles', () => {
    vi.useFakeTimers();
    const fixture = create();
    productServiceMock.getProducts.mockClear();

    fixture.componentInstance.onMinPriceInput('10');
    fixture.componentInstance.onMaxPriceInput('100');
    vi.advanceTimersByTime(400);

    expect(productServiceMock.getProducts).toHaveBeenCalledWith({
      minPrice: 10,
      maxPrice: 100,
      page: 0,
      size: 10,
    });
  });

  it('shows a validation message and does not call the backend when minPrice > maxPrice', () => {
    vi.useFakeTimers();
    const fixture = create();
    productServiceMock.getProducts.mockClear();

    fixture.componentInstance.onMinPriceInput('100');
    fixture.componentInstance.onMaxPriceInput('10');
    vi.advanceTimersByTime(400);
    fixture.detectChanges();

    expect(productServiceMock.getProducts).not.toHaveBeenCalled();
    expect(fixture.componentInstance.priceValidationMessage()).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain(
      'Minimum price must not be greater than maximum price.',
    );
  });

  it('sends the exact backend sort value for the selected sort option', () => {
    const fixture = create();
    productServiceMock.getProducts.mockClear();

    fixture.componentInstance.onSortChange('price,asc');

    expect(productServiceMock.getProducts).toHaveBeenCalledWith({
      sort: 'price,asc',
      page: 0,
      size: 10,
    });
  });

  it('combines search, category, price and sort into a single request', () => {
    vi.useFakeTimers();
    const fixture = create();
    productServiceMock.getProducts.mockClear();

    fixture.componentInstance.onSearchInput('mouse');
    fixture.componentInstance.onMinPriceInput('10');
    fixture.componentInstance.onMaxPriceInput('100');
    vi.advanceTimersByTime(400);
    fixture.componentInstance.onCategoryChange('3');
    fixture.componentInstance.onSortChange('price,asc');

    expect(productServiceMock.getProducts).toHaveBeenLastCalledWith({
      search: 'mouse',
      categoryId: 3,
      minPrice: 10,
      maxPrice: 100,
      sort: 'price,asc',
      page: 0,
      size: 10,
    });
  });

  it('restores all filters and the page to their defaults on Reset Filters, in one request', () => {
    vi.useFakeTimers();
    const fixture = create();

    fixture.componentInstance.onSearchInput('mouse');
    fixture.componentInstance.onCategoryChange('3');
    fixture.componentInstance.onSortChange('price,asc');
    vi.advanceTimersByTime(400);
    productServiceMock.getProducts.mockClear();

    fixture.componentInstance.resetFilters();

    expect(productServiceMock.getProducts).toHaveBeenCalledTimes(1);
    expect(productServiceMock.getProducts).toHaveBeenCalledWith({ page: 0, size: 10 });
    expect(fixture.componentInstance.searchInput()).toBe('');
    expect(fixture.componentInstance.categoryId()).toBe('');
    expect(fixture.componentInstance.sort()).toBe('');
    expect(fixture.componentInstance.page()).toBe(0);
  });

  it('shows the empty state for a filtered result with no matches', () => {
    productServiceMock.getProducts.mockReturnValue(
      of(page({ data: [], totalElements: 0, totalPages: 0 })),
    );
    const fixture = create();

    expect(fixture.nativeElement.textContent).toContain('No products found.');
  });

  it('shows a safe error message with the current filters still applied on failure', () => {
    productServiceMock.getProducts.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    const fixture = create();
    fixture.componentInstance.onCategoryChange('3');

    expect(fixture.componentInstance.error()).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('500');
  });

  it('retries with the current filter state, not the defaults', () => {
    productServiceMock.getProducts.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    const fixture = create();
    fixture.componentInstance.onCategoryChange('3');
    productServiceMock.getProducts.mockClear();
    productServiceMock.getProducts.mockReturnValue(of(page()));

    fixture.componentInstance.retry();

    expect(productServiceMock.getProducts).toHaveBeenCalledWith({
      categoryId: 3,
      page: 0,
      size: 10,
    });
  });

  it('shows a loading indicator while a filtered request is in flight', () => {
    const subject = new Subject<ProductPageResponse>();
    productServiceMock.getProducts.mockReturnValue(subject.asObservable());
    const fixture = create();

    fixture.componentInstance.onCategoryChange('3');
    fixture.detectChanges();

    expect(fixture.componentInstance.loading()).toBe(true);

    subject.next(page());
    subject.complete();
  });

  describe('page navigation', () => {
    function createWithThreePages() {
      productServiceMock.getProducts.mockReturnValue(of(page({ totalPages: 3 })));
      return create();
    }

    it('sends page = 1 when navigating to the next page', () => {
      const fixture = createWithThreePages();
      productServiceMock.getProducts.mockClear();
      productServiceMock.getProducts.mockReturnValue(of(page({ totalPages: 3, page: 1 })));

      fixture.componentInstance.goToPage(1);

      expect(productServiceMock.getProducts).toHaveBeenCalledWith({ page: 1, size: 10 });
      expect(fixture.componentInstance.page()).toBe(1);
    });

    it('sends the correct zero-based page when navigating back to the previous page', () => {
      const fixture = createWithThreePages();
      productServiceMock.getProducts.mockReturnValue(of(page({ totalPages: 3, page: 1 })));
      fixture.componentInstance.goToPage(1);
      productServiceMock.getProducts.mockClear();
      productServiceMock.getProducts.mockReturnValue(of(page({ totalPages: 3, page: 0 })));

      fixture.componentInstance.goToPage(0);

      expect(productServiceMock.getProducts).toHaveBeenCalledWith({ page: 0, size: 10 });
      expect(fixture.componentInstance.page()).toBe(0);
    });

    it('preserves active filters when navigating to another page', () => {
      const fixture = createWithThreePages();
      fixture.componentInstance.onCategoryChange('3');
      productServiceMock.getProducts.mockClear();
      productServiceMock.getProducts.mockReturnValue(of(page({ totalPages: 3, page: 1 })));

      fixture.componentInstance.goToPage(1);

      expect(productServiceMock.getProducts).toHaveBeenCalledWith({
        categoryId: 3,
        page: 1,
        size: 10,
      });
    });

    it('resets to page 0 when a filter changes while on a later page', () => {
      const fixture = createWithThreePages();
      productServiceMock.getProducts.mockReturnValue(of(page({ totalPages: 3, page: 2 })));
      fixture.componentInstance.goToPage(2);
      expect(fixture.componentInstance.page()).toBe(2);

      productServiceMock.getProducts.mockClear();
      productServiceMock.getProducts.mockReturnValue(of(page({ totalPages: 1 })));
      fixture.componentInstance.onCategoryChange('3');

      expect(productServiceMock.getProducts).toHaveBeenCalledWith({
        categoryId: 3,
        page: 0,
        size: 10,
      });
      expect(fixture.componentInstance.page()).toBe(0);
    });

    it('does not go before page 0', () => {
      const fixture = createWithThreePages();
      productServiceMock.getProducts.mockClear();

      fixture.componentInstance.goToPage(-1);

      expect(productServiceMock.getProducts).not.toHaveBeenCalled();
      expect(fixture.componentInstance.page()).toBe(0);
    });

    it('does not go beyond the final page', () => {
      const fixture = createWithThreePages();
      productServiceMock.getProducts.mockClear();

      fixture.componentInstance.goToPage(3);

      expect(productServiceMock.getProducts).not.toHaveBeenCalled();
    });

    it('does not make a request when clicking the current page', () => {
      const fixture = createWithThreePages();
      productServiceMock.getProducts.mockClear();

      fixture.componentInstance.goToPage(0);

      expect(productServiceMock.getProducts).not.toHaveBeenCalled();
    });

    it('keeps the current page on a failed page request and retries the same page', () => {
      const fixture = createWithThreePages();
      productServiceMock.getProducts.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      fixture.componentInstance.goToPage(1);

      expect(fixture.componentInstance.page()).toBe(1);
      expect(fixture.componentInstance.error()).toBeTruthy();

      productServiceMock.getProducts.mockClear();
      productServiceMock.getProducts.mockReturnValue(of(page({ totalPages: 3, page: 1 })));

      fixture.componentInstance.retry();

      expect(productServiceMock.getProducts).toHaveBeenCalledWith({ page: 1, size: 10 });
      expect(fixture.componentInstance.page()).toBe(1);
    });
  });
});
