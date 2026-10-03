import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminCategoryService, CreateCategoryRequest, UpdateCategoryRequest } from '../admin-category.service';
import { resolveErrorMessage } from '../../../../core/utils/http-error.util';
import { applyServerFieldErrors } from '../../../../core/utils/http-error.util';

@Component({
  selector: 'app-admin-category-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-category-form.html',
  styleUrl: './admin-category-form.css'
})
export class AdminCategoryForm {
  private readonly fb = inject(FormBuilder);
  private readonly adminCategoryService = inject(AdminCategoryService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  productForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
  });

  loading = signal(false);
  submitting = signal(false);
  errorMessage = signal<string | null>(null);
  isEditMode = signal(false);
  categoryId = signal<number | null>(null);

  constructor() {
    const id = this.route.snapshot.params['id'];
    if (id) {
      this.isEditMode.set(true);
      this.categoryId.set(parseInt(id, 10));
      this.loadCategory();
    }
  }

  loadCategory() {
    const id = this.categoryId();
    if (!id) return;

    this.loading.set(true);
    this.adminCategoryService.getCategoryById(id).subscribe({
      next: (category) => {
        this.productForm.patchValue({
          name: category.name,
          description: category.description,
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(resolveErrorMessage(err));
        this.loading.set(false);
        this.router.navigate(['/admin/categories']);
      }
    });
  }

  onSubmit() {
    if (this.productForm.invalid) return;

    this.submitting.set(true);
    this.errorMessage.set(null);

    const formValue = this.productForm.value;
    const request = {
      name: formValue.name,
      description: formValue.description,
    };

    if (this.isEditMode()) {
      this.adminCategoryService.updateCategory(this.categoryId()!, request as UpdateCategoryRequest).subscribe({
        next: () => this.router.navigate(['/admin/categories']),
        error: (err) => {
          applyServerFieldErrors(this.productForm, err);
          this.errorMessage.set(resolveErrorMessage(err));
          this.submitting.set(false);
        }
      });
    } else {
      this.adminCategoryService.createCategory(request as CreateCategoryRequest).subscribe({
        next: () => this.router.navigate(['/admin/categories']),
        error: (err) => {
          applyServerFieldErrors(this.productForm, err);
          this.errorMessage.set(resolveErrorMessage(err));
          this.submitting.set(false);
        }
      });
    }
  }
}
