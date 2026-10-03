import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrderResponse, Page } from '../../../../core/models/order.model';
import { AdminOrderService } from '../admin-order.service';
import { resolveErrorMessage } from '../../../../core/utils/http-error.util';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-orders.html',
  styleUrl: './admin-orders.css'
})
export class AdminOrders {
  private readonly orderService = inject(AdminOrderService);

  orders = signal<OrderResponse[]>([]);
  totalElements = signal(0);
  totalPages = signal(0);
  currentPage = signal(0);
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  pageSize = 10;

  constructor() {
    this.loadOrders();
  }

  loadOrders() {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.orderService.getOrders(this.currentPage(), this.pageSize).subscribe({
      next: (response: Page<OrderResponse>) => {
        this.orders.set(response.content);
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
    this.loadOrders();
  }
}
