import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { CategoryResponse } from '../../../core/models/category.model';

export interface CreateCategoryRequest {
  name: string;
  description?: string;
}

export interface UpdateCategoryRequest {
  name: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminCategoryService {
  private readonly http = inject(HttpClient);

  private readonly adminCategoriesUrl = `${environment.apiUrl}/admin/categories`;

  getCategories(): Observable<CategoryResponse[]> {
    return this.http.get<CategoryResponse[]>(this.adminCategoriesUrl);
  }

  getCategoryById(categoryId: number): Observable<CategoryResponse> {
    return this.http.get<CategoryResponse>(`${this.adminCategoriesUrl}/${categoryId}`);
  }

  createCategory(request: CreateCategoryRequest): Observable<CategoryResponse> {
    return this.http.post<CategoryResponse>(this.adminCategoriesUrl, request);
  }

  updateCategory(categoryId: number, request: UpdateCategoryRequest): Observable<CategoryResponse> {
    return this.http.put<CategoryResponse>(`${this.adminCategoriesUrl}/${categoryId}`, request);
  }

  deactivateCategory(categoryId: number): Observable<void> {
    return this.http.delete<void>(`${this.adminCategoriesUrl}/${categoryId}`);
  }
}
