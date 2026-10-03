import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { AdminInventoryService } from '../admin-inventory.service';
import { AdminProductService } from '../../products/admin-product.service';
import { ProductQueryParams, ProductResponse, ProductPageResponse } from '../../../../core/models/product.model';
import { CategoryService } from '../../../../core/services/category.service';
import { CategoryResponse } from '../../../../core/models/category.model';
import { resolveErrorMessage } from '../../../../core/utils/http-error.util';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-admin-inventory',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-inventory.html',
  styleUrl: './admin-inventory.css'
})
export class AdminInventory {
  private readonly inventoryService = inject(AdminInventoryService);
  private readonly productService = inject(AdminProductService);
  private readonly categoryService = inject(CategoryService);

  products = signal<ProductResponse[]>([]);
  totalElements = signal(0);
  totalPages = signal(0);
  currentPage = signal(0);
  categories = signal<CategoryResponse[]>([]);
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  searchControl = new FormControl('');
  selectedCategoryId = signal<number | null>(null);
  pageSize = 10;

  editingProductId = signal<number | null>(null);
  editStockValue = signal<number>(0);

  constructor() {
    this.loadCategories();
    this.loadInventory();

    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
    ).subscribe(() => {
      this.currentPage.set(0);
      this.loadInventory();
    });
  }

  loadCategories() {
    this.categoryService.getCategories().subscribe({
      next: (cats) => this.categories.set(cats),
      error: (err) => this.errorMessage.set(resolveErrorMessage(err))
    });
  }

  loadInventory() {
    this.loading.set(true);
    this.errorMessage.set(null);

    const params: ProductQueryParams = {
      search: this.searchControl.value ?? undefined,
      categoryId: this.selectedCategoryId() ?? undefined,
      page: this.currentPage(),
      size: this.pageSize
    };

    // Reuse AdminProductService.getProducts to get the list
    this.productService.getProducts(params).subscribe({
      next: (response: ProductPageResponse) => {
        this.products.set(response.data);
        this.totalElements.set(response.totalElements);
        this.totalPages.set(response.totalPages);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(resolveErrorMessage(err));
        this.loading.set(false);
      }
    });
  }

  onCategoryChange(categoryId: string) {
    this.selectedCategoryId.set(categoryId ? parseInt(categoryId, 10) : null);
    this.currentPage.set(0);
    this.loadInventory();
  }

  goToPage(page: number) {
    this.currentPage.set(page);
    this.loadInventory();
  }

  startEdit(product: ProductResponse) {
    this.editingProductId.set(product.id);
    this.editStockValue.set(product.stockQuantity);
  }

  cancelEdit() {
    this.editingProductId.set(null);
  }

  saveStock(productId: number) {
    if (this.editStockValue() < 0) {
      this.errorMessage.set('Stock quantity cannot be negative.');
      return;
    }

    this.inventoryService.updateStock(productId, this.editStockValue()).subscribe({
      next: () => {
        this.editingProductId.set(null);
        this.loadInventory();
      },
      error: (err) => {
        this.errorMessage.set(resolveErrorMessage(err));
      }
    });
  }

  getInventoryStatus(stock: number): { label: string, class: string } {
    if (stock === 0) return { label: 'OUT OF STOCK', class: 'out-of-stock' };
    if (stock <= 10) return { label: 'LOW STOCK', class: 'low-stock' };
    return { label: 'IN STOCK', class: 'in-stock' };
  }

  clearFilters() {
    this.searchControl.setValue('');
    this.selectedCategoryId.set(null);
    this.currentPage.set(0);
    this.loadInventory();
  }
}
