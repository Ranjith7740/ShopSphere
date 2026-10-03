import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CategoryService } from '../../../../core/services/category.service';
import { AdminProductService, CreateProductRequest, UpdateProductRequest } from '../admin-product.service';
import { CategoryResponse } from '../../../../core/models/category.model';
import { resolveErrorMessage } from '../../../../core/utils/http-error.util';

@Component({
  selector: 'app-admin-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-product-form.html',
  styleUrl: './admin-product-form.css'
})
export class AdminProductForm {
  private readonly fb = inject(FormBuilder);
  private readonly adminProductService = inject(AdminProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  productForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
    categoryId: ['', [Validators.required]],
    price: [null, [Validators.required, Validators.min(0)]],
    stockQuantity: [null, [Validators.required, Validators.min(0)]],
  });

  categories = signal<CategoryResponse[]>([]);
  loading = signal(false);
  submitting = signal(false);
  errorMessage = signal<string | null>(null);
  isEditMode = signal(false);
  productId = signal<number | null>(null);

  constructor() {
    this.loadCategories();
    const id = this.route.snapshot.params['id'];
    if (id) {
      this.isEditMode.set(true);
      this.productId.set(parseInt(id, 10));
      this.loadProduct();
    }
  }

  loadCategories() {
    this.categoryService.getCategories().subscribe({
      next: (cats) => this.categories.set(cats),
      error: (err) => this.errorMessage.set(resolveErrorMessage(err))
    });
  }

  loadProduct() {
    const id = this.productId();
    if (!id) return;

    this.loading.set(true);
    this.adminProductService.getProductById(id).subscribe({
      next: (product) => {
        this.productForm.patchValue({
          name: product.name,
          description: product.description,
          categoryId: product.categoryId,
          price: product.price,
          stockQuantity: product.stockQuantity,
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(resolveErrorMessage(err));
        this.loading.set(false);
        this.router.navigate(['/admin/products']);
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
      categoryId: Number(formValue.categoryId),
      price: Number(formValue.price),
      stockQuantity: Number(formValue.stockQuantity),
    };

    if (this.isEditMode()) {
      this.adminProductService.updateProduct(this.productId()!, request as UpdateProductRequest).subscribe({
        next: () => this.router.navigate(['/admin/products']),
        error: (err) => {
          this.errorMessage.set(resolveErrorMessage(err));
          this.submitting.set(false);
        }
      });
    } else {
      this.adminProductService.createProduct(request as CreateProductRequest).subscribe({
        next: () => this.router.navigate(['/admin/products']),
        error: (err) => {
          this.errorMessage.set(resolveErrorMessage(err));
          this.submitting.set(false);
        }
      });
    }
  }
}
