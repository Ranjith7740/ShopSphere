import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CategoryService } from '../../core/services/category.service';
import { CategoryResponse } from '../../core/models/category.model';
import { ProductService } from '../../core/services/product.service';
import { ProductResponse } from '../../core/models/product.model';
import { ProductCard } from '../../shared/product-card/product-card';
import { AuthService } from '../../core/services/auth.service';
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, ProductCard],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private readonly categoryService = inject(CategoryService);
  private readonly productService = inject(ProductService);
  // Categories
  readonly categories = signal<CategoryResponse[]>([]);
  readonly categoriesLoading = signal(true);
  readonly categoriesError = signal(false);
  // Featured products
  readonly featuredProducts = signal<ProductResponse[]>([]);
  readonly featuredProductsLoading = signal(true);
  readonly featuredProductsError = signal(false);

  private readonly authService = inject(AuthService);
  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly currentUser= this.authService.currentUser;
  readonly currentYear = new Date().getFullYear();
  constructor() {
    this.loadCategories();
    this.loadFeaturedProducts();
  }
  private loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.categoriesLoading.set(false);
      },
      error: () => {
        this.categoriesLoading.set(false);
        this.categoriesError.set(true);
      },
    });
  }
  private loadFeaturedProducts(): void {
    this.productService
      .getProducts({
        page: 0,
        size: 4,
      })
      .subscribe({
        next: (response) => {
          this.featuredProducts.set(response.data.filter((product) => product.status === 'ACTIVE'));
          this.featuredProductsLoading.set(false);
        },
        error: () => {
          this.featuredProductsLoading.set(false);
          this.featuredProductsError.set(true);
        },
      });
  }
}
