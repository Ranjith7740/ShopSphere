import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { AdminCategoryService } from '../admin-category.service';
import { CategoryResponse } from '../../../../core/models/category.model';
import { resolveErrorMessage } from '../../../../core/utils/http-error.util';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './admin-categories.html',
  styleUrl: './admin-categories.css'
})
export class AdminCategories {
  private readonly categoryService = inject(AdminCategoryService);

  categories = signal<CategoryResponse[]>([]);
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  constructor() {
    this.loadCategories();
  }

  loadCategories() {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.categoryService.getCategories().subscribe({
      next: (cats) => {
        this.categories.set(cats);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(resolveErrorMessage(err));
        this.loading.set(false);
      }
    });
  }

  deactivateCategory(categoryId: number) {
    if (confirm('Are you sure you want to deactivate this category?')) {
      this.categoryService.deactivateCategory(categoryId).subscribe({
        next: () => this.loadCategories(),
        error: (err) => {
          this.errorMessage.set(resolveErrorMessage(err));
        }
      });
    }
  }
}
