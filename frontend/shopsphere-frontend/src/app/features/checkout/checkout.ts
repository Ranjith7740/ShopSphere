import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { CartService } from '../../core/services/cart.service';
import { AddressService } from '../../core/services/address.service';
import { OrderService } from '../../core/services/order.service';
import { resolveErrorMessage } from '../../core/utils/http-error.util';
import { CartItemResponse } from '../../core/models/cart.model';
import { AddressResponse } from '../../core/models/address.model';
import { AddressForm } from '../profile/address-form/address-form';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [AddressForm, RouterLink, DecimalPipe, CurrencyPipe],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout implements OnInit {
  private readonly cartService = inject(CartService);
  private readonly addressService = inject(AddressService);
  private readonly orderService = inject(OrderService);
  private readonly router = inject(Router);

  readonly cart = this.cartService.cart;
  readonly addresses = this.addressService.addresses;

  readonly loadingCart = signal(false);
  readonly cartError = signal<string | null>(null);
  readonly loadingAddresses = signal(false);
  readonly addressError = signal<string | null>(null);
  readonly selectedAddressId = signal<number | null>(null);
  readonly showAddressForm = signal(false);
  readonly editingAddress = signal<AddressResponse | null>(null);
  readonly addressFeedback = signal<string | null>(null);

  readonly isPlacingOrder = signal(false);
  readonly placeOrderError = signal<string | null>(null);

  readonly cartHasUnavailableItems = computed(() =>
    (this.cart()?.items ?? []).some((item) => this.isItemUnavailable(item)),
  );

  readonly isCheckoutReady = computed(() => {
    const cart = this.cart();
    if (!cart || cart.items.length === 0) return false;
    if (this.cartHasUnavailableItems()) return false;
    const selectedId = this.selectedAddressId();
    if (selectedId === null) return false;
    return this.addresses().some((address) => address.id === selectedId);
  });

  readonly checkoutBlockedReason = computed(() => {
    const cart = this.cart();
    if (!cart || cart.items.length === 0) return null;
    if (this.cartHasUnavailableItems()) {
      return 'Some items in your cart are unavailable. Please update your cart before continuing.';
    }
    const selectedId = this.selectedAddressId();
    if (selectedId === null || !this.addresses().some((address) => address.id === selectedId)) {
      return 'Please select a delivery address to continue.';
    }
    return null;
  });

  ngOnInit(): void {
    this.ensureCartLoaded();
    this.ensureAddressesLoaded();
  }

  retryCart(): void {
    this.ensureCartLoaded(true);
  }

  retryAddresses(): void {
    this.ensureAddressesLoaded(true);
  }

  selectAddress(addressId: number): void {
    this.selectedAddressId.set(addressId);
  }

  openAddForm(): void {
    this.editingAddress.set(null);
    this.showAddressForm.set(true);
    this.addressFeedback.set(null);
  }

  openEditForm(address: AddressResponse): void {
    this.editingAddress.set(address);
    this.showAddressForm.set(true);
    this.addressFeedback.set(null);
  }

  closeAddressForm(): void {
    this.showAddressForm.set(false);
    this.editingAddress.set(null);
  }

  onAddressSaved(saved: AddressResponse): void {
    const wasNewAddress = this.editingAddress() === null;
    this.closeAddressForm();
    if (wasNewAddress) {
      this.selectedAddressId.set(saved.id);
      this.addressFeedback.set('Address added successfully.');
    } else {
      this.addressFeedback.set('Address updated successfully.');
    }
  }

  placeOrder(): void {
    if (!this.isCheckoutReady()) return;

    this.isPlacingOrder.set(true);
    this.placeOrderError.set(null);

    this.orderService.placeOrder({ addressId: this.selectedAddressId()! }).subscribe({
      next: (order) => {
        this.isPlacingOrder.set(false);
        this.router.navigate(['/order-success', order.id]);
      },
      error: (err) => {
        this.isPlacingOrder.set(false);
        this.placeOrderError.set(resolveErrorMessage(err));
      },
    });
  }

  itemUnavailableReason(item: CartItemResponse): string | null {
    if (!item.productActive) return 'Product no longer available';
    if (item.availableStock === 0) return 'Out of stock';
    if (item.quantity > item.availableStock) {
      return `Only ${item.availableStock} left. Reduce quantity.`;
    }
    return null;
  }

  private isItemUnavailable(item: CartItemResponse): boolean {
    return this.itemUnavailableReason(item) !== null;
  }

  private ensureCartLoaded(force = false): void {
    if (!force && this.cartService.cart() !== null) return;
    this.loadingCart.set(true);
    this.cartError.set(null);
    this.cartService.getCart().subscribe({
      next: () => this.loadingCart.set(false),
      error: (err) => {
        this.loadingCart.set(false);
        this.cartError.set(resolveErrorMessage(err));
      },
    });
  }

  private ensureAddressesLoaded(force = false): void {
    if (!force && this.addressService.addresses().length > 0) {
      this.preselectDefaultAddress();
      return;
    }
    this.loadingAddresses.set(true);
    this.addressError.set(null);
    this.addressService.getAddresses().subscribe({
      next: () => {
        this.loadingAddresses.set(false);
        this.preselectDefaultAddress();
      },
      error: (err) => {
        this.loadingAddresses.set(false);
        this.addressError.set(resolveErrorMessage(err));
      },
    });
  }

  private preselectDefaultAddress(): void {
    if (this.selectedAddressId() !== null) return;
    const defaultAddress = this.addressService.addresses().find((address) => address.isDefault);
    if (defaultAddress) {
      this.selectedAddressId.set(defaultAddress.id);
    }
  }
}
