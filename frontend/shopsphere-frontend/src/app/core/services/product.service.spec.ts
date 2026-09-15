import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ProductService } from './product.service';
import { ProductPageResponse, ProductResponse } from '../models/product.model';
import { environment } from '../../../environments/environment';

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

const PAGE: ProductPageResponse = {
  data: [PRODUCT],
  page: 0,
  size: 10,
  totalElements: 1,
  totalPages: 1,
};

describe('ProductService', () => {
  let service: ProductService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProductService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('calls GET /products with no query params when none are supplied', () => {
    let result: ProductPageResponse | undefined;

    service.getProducts({}).subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${environment.apiUrl}/products`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().length).toBe(0);
    req.flush(PAGE);

    expect(result).toEqual(PAGE);
  });

  it('sends only the query params that were supplied', () => {
    service
      .getProducts({ search: 'mouse', categoryId: 3, minPrice: 10, sort: 'price,asc' })
      .subscribe();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/products`);
    expect(req.request.params.get('search')).toBe('mouse');
    expect(req.request.params.get('categoryId')).toBe('3');
    expect(req.request.params.get('minPrice')).toBe('10');
    expect(req.request.params.get('sort')).toBe('price,asc');
    expect(req.request.params.has('maxPrice')).toBe(false);
    expect(req.request.params.has('page')).toBe(false);
    expect(req.request.params.has('size')).toBe(false);
    req.flush(PAGE);
  });

  it('omits an empty or blank search string', () => {
    service.getProducts({ search: '   ' }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/products`);
    expect(req.request.params.has('search')).toBe(false);
    req.flush(PAGE);
  });

  it('gets a product by id from /products/{id}', () => {
    let result: ProductResponse | undefined;

    service.getProductById(1).subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${environment.apiUrl}/products/1`);
    expect(req.request.method).toBe('GET');
    req.flush(PRODUCT);

    expect(result).toEqual(PRODUCT);
  });
});
