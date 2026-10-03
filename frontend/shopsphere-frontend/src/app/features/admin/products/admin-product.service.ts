import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ProductPageResponse, ProductQueryParams, ProductResponse } from '../../../core/models/product.model';

export interface CreateProductRequest {
  categoryId: number;
  name: string;
  description?: string;
  price: number;
  stockQuantity: number;
}

export interface UpdateProductRequest {
  categoryId: number;
  name: string;
  description?: string;
  price: number;
  stockQuantity: number;
}

@Injectable({ providedIn: 'root' })
export class AdminProductService {
  private readonly http = inject(HttpClient);

  private readonly adminProductsUrl = `${environment.apiUrl}/admin/products`;

  getProducts(params: ProductQueryParams): Observable<ProductPageResponse> {
    return this.http.get<ProductPageResponse>(this.adminProductsUrl, {
      params: this.buildParams(params),
    });
  }

  createProduct(request: CreateProductRequest): Observable<ProductResponse> {
    return this.http.post<ProductResponse>(this.adminProductsUrl, request);
  }

  updateProduct(productId: number, request: UpdateProductRequest): Observable<ProductResponse> {
    return this.http.put<ProductResponse>(`${this.adminProductsUrl}/${productId}`, request);
  }

  deactivateProduct(productId: number): Observable<void> {
    return this.http.delete<void>(`${this.adminProductsUrl}/${productId}`);
  }

  getProductById(productId: number): Observable<ProductResponse> {
    return this.http.get<ProductResponse>(`${this.adminProductsUrl}/${productId}`);
  }

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
