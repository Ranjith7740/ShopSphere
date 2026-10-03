import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminOrderService } from '../admin-order.service';
import { OrderResponse, OrderStatus } from '../../../../core/models/order.model';
import { resolveErrorMessage } from '../../../../core/utils/http-error.util';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-admin-order-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-order-detail.html',
  styleUrl: './admin-order-detail.css'
})
export class AdminOrderDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orderService = inject(AdminOrderService);

  order = signal<OrderResponse | null>(null);
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  updating = signal(false);

  selectedStatus = signal<string>('');

  // Full list of order statuses for the dropdown
  orderStatuses: string[] = Object.values(OrderStatus);

  constructor() {
    const orderId = this.route.snapshot.paramMap.get('id');
    if (orderId) {
      this.loadOrder(orderId);
    }
  }

  loadOrder(id: string) {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.orderService.getOrderById(id).subscribe({
      next: (order) => {
        this.order.set(order);
        this.selectedStatus.set(order.orderStatus);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(resolveErrorMessage(err));
        this.loading.set(false);
      }
    });
  }

  updateStatus() {
    const order = this.order();
    if (!order) return;

    this.updating.set(true);
    this.errorMessage.set(null);

    this.orderService.updateOrderStatus(order.id.toString(), this.selectedStatus()).subscribe({
      next: (updatedOrder) => {
        this.order.set(updatedOrder);
        this.updating.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(resolveErrorMessage(err));
        this.updating.set(false);
      }
    });
  }

  goBack() {
    this.router.navigate(['/admin/orders']);
  }
}
