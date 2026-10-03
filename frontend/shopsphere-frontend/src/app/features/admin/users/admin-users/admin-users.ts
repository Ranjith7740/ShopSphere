import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { AdminCustomerService } from '../admin-customer.service';
import { UserResponse } from '../../../../core/models/user.model';
import { resolveErrorMessage } from '../../../../core/utils/http-error.util';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.css'
})
export class AdminUsers {
  private readonly customerService = inject(AdminCustomerService);

  users = signal<UserResponse[]>([]);
  totalElements = signal(0);
  totalPages = signal(0);
  currentPage = signal(0);
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  pageSize = 10;

  searchControl = new FormControl('');

  constructor() {
    this.loadUsers();

    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
    ).subscribe(() => {
      this.currentPage.set(0);
      this.loadUsers();
    });
  }

  loadUsers() {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.customerService.getCustomers(
      this.currentPage(),
      this.pageSize,
      this.searchControl.value ?? ''
    ).subscribe({
      next: (response) => {
        this.users.set(response.content);
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

  goToPage(page: number) {
    this.currentPage.set(page);
    this.loadUsers();
  }

  clearSearch() {
    this.searchControl.setValue('');
    this.currentPage.set(0);
    this.loadUsers();
  }
}
