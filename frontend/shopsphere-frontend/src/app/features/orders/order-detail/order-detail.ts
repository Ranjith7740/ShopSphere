import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { OrderService } from '../../../core/services/order.service';
import { OrderResponse, OrderStatus } from '../../../core/models/order.model';
import { OrderTimeline } from '../../../shared/components/order-timeline/order-timeline';
import { resolveErrorMessage } from '../../../core/utils/http-error.util';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, DecimalPipe, CurrencyPipe, OrderTimeline],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.css',
})
export class OrderDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orderService = inject(OrderService);

  readonly order = signal<OrderResponse | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly isCancelling = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    if (!id || isNaN(Number(id)) || Number(id) <= 0) {
      this.error.set('Invalid order ID');
      return;
    }
    this.loadOrder(Number(id));
  }

  loadOrder(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.orderService.getOrderById(id).subscribe({
      next: (order: OrderResponse) => {
        this.order.set(order);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.error.set(resolveErrorMessage(err));
      },
    });
  }

  readonly canCancel = computed(() => {
    const status = this.order()?.orderStatus;
    return status === OrderStatus.PLACED || status === OrderStatus.CONFIRMED;
  });

  cancelOrder(): void {
    if (!confirm('Are you sure you want to cancel this order?')) return;

    const id = this.order()?.id;
    if (!id) return;

    this.isCancelling.set(true);
    this.orderService.cancelOrder(id).subscribe({
      next: () => {
        this.isCancelling.set(false);
        this.loadOrder(id);
      },
      error: (err: any) => {
        this.isCancelling.set(false);
        this.error.set(resolveErrorMessage(err));
      },
    });
  }
}
