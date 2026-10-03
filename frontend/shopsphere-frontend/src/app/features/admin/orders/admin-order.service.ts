import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { OrderResponse, OrderStatusUpdateRequest, OrderStatus, Page } from '../../../core/models/order.model';

@Injectable({ providedIn: 'root' })
export class AdminOrderService {
  private readonly http = inject(HttpClient);

  private readonly adminOrdersUrl = `${environment.apiUrl}/admin/orders`;

  getOrders(page: number, size: number): Observable<Page<OrderResponse>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<Page<OrderResponse>>(this.adminOrdersUrl, { params });
  }

  getOrderById(id: string): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(`${this.adminOrdersUrl}/${id}`);
  }

  updateOrderStatus(id: string, status: string): Observable<OrderResponse> {
    const body: OrderStatusUpdateRequest = { status: status as OrderStatus };
    return this.http.put<OrderResponse>(`${this.adminOrdersUrl}/${id}/status`, body);
  }
}
