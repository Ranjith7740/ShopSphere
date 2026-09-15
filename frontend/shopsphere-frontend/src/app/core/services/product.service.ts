import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ProductPageResponse, ProductQueryParams, ProductResponse } from '../models/product.model';

/**
 * Public read-only product catalog calls. Errors are left to propagate to
 * callers - the auth interceptor already handles the 401/logout case, and
 * components use the shared http-error utilities to render the rest.
 */
@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);

  private readonly productsUrl = `${environment.apiUrl}/products`;

  getProducts(params: ProductQueryParams): Observable<ProductPageResponse> {
    return this.http.get<ProductPageResponse>(this.productsUrl, {
      params: this.buildParams(params),
    });
  }

  getProductById(productId: number): Observable<ProductResponse> {
    return this.http.get<ProductResponse>(`${this.productsUrl}/${productId}`);
  }

  // Only sends params the caller actually supplied, so the backend's own
  // defaults (e.g. sort=createdAt,desc, size=10) stay in effect otherwise.
  private buildParams(params: ProductQueryParams): HttpParams {
    let httpParams = new HttpParams();

    if (params.search && params.search.trim() !== '') {
      httpParams = httpParams.set('search', params.search.trim());
    }
    if (params.categoryId != null) {
      httpParams = httpParams.set('categoryId', params.categoryId);
    }
    if (params.minPrice != null) {
      httpParams = httpParams.set('minPrice', params.minPrice);
    }
    if (params.maxPrice != null) {
      httpParams = httpParams.set('maxPrice', params.maxPrice);
    }
    if (params.sort) {
      httpParams = httpParams.set('sort', params.sort);
    }
    if (params.page != null) {
      httpParams = httpParams.set('page', params.page);
    }
    if (params.size != null) {
      httpParams = httpParams.set('size', params.size);
    }

    return httpParams;
  }
}
