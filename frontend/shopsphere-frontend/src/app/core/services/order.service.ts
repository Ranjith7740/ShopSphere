import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OrderResponse, OrderItemResponse, OrderAddressResponse, PlaceOrderRequest, Page } from '../models/order.model';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/orders`;

  placeOrder(request: PlaceOrderRequest): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(this.url, request);
  }

  getOrders(page: number, size: number): Observable<Page<OrderResponse>> {
    return this.http.get<Page<OrderResponse>>(`${this.url}?page=${page}&size=${size}&sort=createdAt,desc`);
  }

  getOrderById(id: number): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(`${this.url}/${id}`);
  }

  cancelOrder(id: number): Observable<void> {
    return this.http.post<void>(`${this.url}/${id}/cancel`, {});
  }
}
