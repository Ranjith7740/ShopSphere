import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, ReplaySubject, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ProductDetail } from './product-detail';
import { ProductService } from '../../../core/services/product.service';
import { ProductResponse } from '../../../core/models/product.model';

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

describe('ProductDetail', () => {
  let productServiceMock: { getProductById: ReturnType<typeof vi.fn> };
  let paramMap$: ReplaySubject<ReturnType<typeof convertToParamMap>>;

  function setup(routeParam: string | null) {
    paramMap$ = new ReplaySubject(1);
    paramMap$.next(convertToParamMap(routeParam !== null ? { productId: routeParam } : {}));

    TestBed.configureTestingModule({
      imports: [ProductDetail],
      providers: [
        provideRouter([]),
        { provide: ProductService, useValue: productServiceMock },
        { provide: ActivatedRoute, useValue: { paramMap: paramMap$.asObservable() } },
      ],
    });

    const fixture = TestBed.createComponent(ProductDetail);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    productServiceMock = { getProductById: vi.fn().mockReturnValue(of(PRODUCT)) };
  });

  it('calls getProductById with the correct numeric id for a valid route param', () => {
    setup('7');

    expect(productServiceMock.getProductById).toHaveBeenCalledWith(7);
  });

  it('displays the loaded product details', () => {
    const fixture = setup('7');

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Wireless Mouse');
    expect(text).toContain('Electronics');
    expect(text).toContain('29.99');
    expect(text).toContain('Ergonomic wireless mouse');
  });

  it('shows a loading state while the request is in flight', () => {
    const subject = new Subject<ProductResponse>();
    productServiceMock.getProductById.mockReturnValue(subject.asObservable());

    const fixture = setup('7');

    expect(fixture.componentInstance.loading()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Loading product...');

    subject.next(PRODUCT);
    subject.complete();
  });

  it('does not call the backend for a non-numeric route param', () => {
    setup('abc');

    expect(productServiceMock.getProductById).not.toHaveBeenCalled();
  });

  it('does not call the backend for a zero route param', () => {
    setup('0');
    expect(productServiceMock.getProductById).not.toHaveBeenCalled();
  });

  it('does not call the backend for a negative route param', () => {
    setup('-3');
    expect(productServiceMock.getProductById).not.toHaveBeenCalled();
  });

  it('shows the invalid-product state for a non-numeric route param', () => {
    const fixture = setup('abc');

    expect(fixture.componentInstance.invalidId()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Invalid product.');
  });

  it('shows "Product not found" on a 404 without exposing raw backend details', () => {
    productServiceMock.getProductById.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 404,
            error: { message: 'Product not found with id: 7' },
          }),
      ),
    );

    const fixture = setup('7');

    expect(fixture.componentInstance.notFound()).toBe(true);
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Product not found');
    expect(text).not.toContain('with id: 7');
  });

  it('shows a safe error message with a Retry action for a non-404 failure', () => {
    productServiceMock.getProductById.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    const fixture = setup('7');

    expect(fixture.componentInstance.error()).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('500');
    const retryButton: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(retryButton.textContent).toContain('Retry');
  });

  it('retries the same product id when Retry is clicked', () => {
    productServiceMock.getProductById.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    const fixture = setup('7');
    productServiceMock.getProductById.mockClear();
    productServiceMock.getProductById.mockReturnValue(of(PRODUCT));

    fixture.componentInstance.retry();

    expect(productServiceMock.getProductById).toHaveBeenCalledWith(7);
  });

  it('shows "Out of Stock" when stockQuantity is 0', () => {
    productServiceMock.getProductById.mockReturnValue(of({ ...PRODUCT, stockQuantity: 0 }));

    const fixture = setup('7');

    expect(fixture.componentInstance.inStock()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Out of Stock');
  });

  it('shows "In Stock" when stockQuantity is greater than 0', () => {
    const fixture = setup('7');

    expect(fixture.componentInstance.inStock()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('In Stock');
  });

  it('provides a Back to Products link', () => {
    const fixture = setup('7');

    const backLink: HTMLAnchorElement = fixture.nativeElement.querySelector('a.back-link');
    expect(backLink.getAttribute('href')).toBe('/products');
  });
});
