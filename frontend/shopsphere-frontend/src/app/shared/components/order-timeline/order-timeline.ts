import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderStatus } from '../../../core/models/order.model';

@Component({
  selector: 'app-order-timeline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="timeline-container">
      @if (status === 'CANCELLED') {
        <div class="cancelled-status">
          <span class="status-icon">❌</span>
          <span class="status-text">Order Cancelled</span>
        </div>
      } @else {
        <div class="steps">
          @for (step of steps; track step) {
            <div class="step" [class.completed]="statusValue(step) <= statusValue(status ?? '')">
              <div class="dot"></div>
              <div class="label">{{ step }}</div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .timeline-container {
      padding: 20px 0;
      display: flex;
      justify-content: center;
    }
    .cancelled-status {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #dc3545;
      font-weight: bold;
      font-size: 1.1rem;
    }
    .steps {
      display: flex;
      align-items: center;
      gap: 0;
      width: 100%;
      max-width: 600px;
      justify-content: space-between;
    }
    .step {
      display: flex;
      flex-init: 1;
      flex-direction: column;
      align-items: center;
      position: relative;
      flex: 1;
    }
    .step:not(:last-child)::after {
      content: '';
      position: absolute;
      top: 10px;
      left: 50%;
      width: 100%;
      height: 2px;
      background: #ddd;
      z-index: 1;
    }
    .step.completed::after {
      background: #28a745;
    }
    .dot {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #ddd;
      border: 2px solid #fff;
      z-index: 2;
      position: relative;
      transition: background 0.3s;
    }
    .step.completed .dot {
      background: #28a745;
    }
    .label {
      font-size: 0.75rem;
      margin-top: 8px;
      color: #666;
      text-align: center;
    }
    .step.completed .label {
      color: #000;
      font-weight: bold;
    }
  `]
})
export class OrderTimeline {
  @Input() status?: OrderStatus;
  readonly steps = ['PLACED', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

  statusValue(status: string | undefined): number {
    const values: Record<string, number> = {
      'PLACED': 0,
      'CONFIRMED': 1,
      'PROCESSING': 2,
      'SHIPPED': 3,
      'DELIVERED': 4
    };
    return values[status ?? ''] ?? 99;
  }
}