import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';

import { AdminProductService } from '../admin-product.service';
import { CategoryService } from '../../../../core/services/category.service';
import { ProductQueryParams, ProductResponse } from '../../../../core/models/product.model';
import { CategoryResponse } from '../../../../core/models/category.model';
import { resolveErrorMessage } from '../../../../core/utils/http-error.util';


@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-products.html',
  styleUrl: './admin-products.css'
})
export class AdminProducts {
  private readonly productService = inject(AdminProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly router = inject(Router);

  // State
  products = signal<ProductResponse[]>([]);
  totalElements = signal(0);
  totalPages = signal(0);
  currentPage = signal(0);
  categories = signal<CategoryResponse[]>([]);
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  // Filters
  searchControl = new FormControl('');
  selectedCategoryId = signal<number | null>(null);
  selectedSort = signal('createdAt,desc');
  pageSize = 10;

  constructor() {
    this.loadCategories();
    this.loadProducts();

    // Debounced search
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => {
        this.currentPage.set(0);
        this.loadProducts();
      })
    ).subscribe();
  }

  loadCategories() {
    this.categoryService.getCategories().subscribe({
      next: (cats) => this.categories.set(cats),
      error: (err) => this.errorMessage.set(resolveErrorMessage(err))
    });
  }

  loadProducts() {
    this.loading.set(true);
    this.errorMessage.set(null);

    const params: ProductQueryParams = {
      search: this.searchControl.value ?? undefined,
      categoryId: this.selectedCategoryId() ?? undefined,
      sort: this.selectedSort(),
      page: this.currentPage(),
      size: this.pageSize
    };

    this.productService.getProducts(params).subscribe({
      next: (response) => {
        this.products.set(response.data);
        this.totalElements.set(response.totalElements);
        this.totalPages.set(response.totalPages);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(resolveErrorMessage(err));
        this.loading.set(false);
      }
    });
  }

  onCategoryChange(categoryId: string) {
    this.selectedCategoryId.set(categoryId ? parseInt(categoryId, 10) : null);
    this.currentPage.set(0);
    this.loadProducts();
  }

  onSortChange(sort: string) {
    this.selectedSort.set(sort);
    this.currentPage.set(0);
    this.loadProducts();
  }

  goToPage(page: number) {
    this.currentPage.set(page);
    this.loadProducts();
  }

  deactivateProduct(productId: number) {
    if (confirm('Are you sure you want to deactivate this product?')) {
      this.productService.deactivateProduct(productId).subscribe({
        next: () => this.loadProducts(),
        error: (err) => {
          this.errorMessage.set(resolveErrorMessage(err));
        }
      });
    }
  }

  clearFilters() {
    this.searchControl.setValue('');
    this.selectedCategoryId.set(null);
    this.selectedSort.set('createdAt,desc');
    this.currentPage.set(0);
    this.loadProducts();
  }
}
