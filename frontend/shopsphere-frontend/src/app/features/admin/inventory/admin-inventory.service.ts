import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ProductPageResponse, ProductQueryParams, ProductResponse } from '../../../core/models/product.model';

@Injectable({ providedIn: 'root' })
export class AdminInventoryService {
  private readonly http = inject(HttpClient);

  private readonly adminProductsUrl = `${environment.apiUrl}/admin/products`;

  getInventory(params: ProductQueryParams): Observable<ProductPageResponse> {
    return this.http.get<ProductPageResponse>(this.adminProductsUrl, {
      params: this.buildParams(params),
    });
  }

  updateStock(productId: number, stockQuantity: number): Observable<ProductResponse> {
    return this.http.patch<ProductResponse>(`${this.adminProductsUrl}/${productId}/inventory`, {
      stockQuantity,
    });
  }

  private buildParams(params: ProductQueryParams): HttpParams {
    let httpParams = new HttpParams();

    if (params.search && params.search.trim() !== '') {
      httpParams = httpParams.set('search', params.search.trim());
    }
    if (params.categoryId != null) {
      httpParams = httpParams.set('categoryId', params.categoryId);
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
