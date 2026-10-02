import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';

import { OrderService } from '../../../core/services/order.service';
import { OrderResponse } from '../../../core/models/order.model';
import { resolveErrorMessage } from '../../../core/utils/http-error.util';

@Component({
  selector: 'app-order-success',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DecimalPipe, RouterLink], // Added RouterLink here
  templateUrl: './order-success.html',
  styleUrl: './order-success.css',
})
export class OrderSuccess implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly orderService = inject(OrderService);

  readonly order = signal<OrderResponse | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    if (!id || isNaN(Number(id))) {
      this.error.set('Invalid order ID');
      return;
    }
    this.loadOrder(Number(id));
  }

  public loadOrder(id: number): void {
    this.loading.set(true);
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
}