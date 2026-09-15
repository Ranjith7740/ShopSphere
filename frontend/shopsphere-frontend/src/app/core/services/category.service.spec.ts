import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { CategoryService } from './category.service';
import { CategoryResponse } from '../models/category.model';
import { environment } from '../../../environments/environment';

const CATEGORIES: CategoryResponse[] = [
  {
    id: 3,
    name: 'Electronics',
    description: 'Electronic devices and accessories',
    status: 'ACTIVE',
    createdAt: '2026-01-10T12:00:00',
    updatedAt: '2026-01-10T12:00:00',
  },
];

describe('CategoryService', () => {
  let service: CategoryService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CategoryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('gets the active categories from /categories', () => {
    let result: CategoryResponse[] | undefined;

    service.getCategories().subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${environment.apiUrl}/categories`);
    expect(req.request.method).toBe('GET');
    req.flush(CATEGORIES);

    expect(result).toEqual(CATEGORIES);
  });
});
