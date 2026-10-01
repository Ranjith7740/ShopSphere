import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { AddressService } from '../../../core/services/address.service';
import { resolveErrorMessage } from '../../../core/utils/http-error.util';
import { AddressResponse } from '../../../core/models/address.model';
import { AddressForm } from '../address-form/address-form';

/**
 * Lists the signed-in customer's addresses. The list itself is read straight
 * from AddressService.addresses() rather than copied locally, so it always
 * reflects the backend's view after any mutation. Only operation-specific UI
 * state (initial load, which address is mid-delete/mid-default-change, the
 * create/edit panel) lives here.
 */
@Component({
  selector: 'app-addresses',
  imports: [AddressForm],
  templateUrl: './addresses.html',
  styleUrl: './addresses.css',
})
export class Addresses implements OnInit {
  private readonly addressService = inject(AddressService);

  readonly addresses = this.addressService.addresses;

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly showForm = signal(false);
  readonly editingAddress = signal<AddressResponse | null>(null);

  readonly deletingAddressId = signal<number | null>(null);
  readonly settingDefaultAddressId = signal<number | null>(null);
  readonly rowError = signal<ReadonlyMap<number, string>>(new Map());

  readonly successMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadAddresses();
  }

  retry(): void {
    this.loadAddresses();
  }

  openAddForm(): void {
    this.editingAddress.set(null);
    this.showForm.set(true);
    this.successMessage.set(null);
  }

  openEditForm(address: AddressResponse): void {
    this.editingAddress.set(address);
    this.showForm.set(true);
    this.successMessage.set(null);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingAddress.set(null);
  }

  onSaved(): void {
    const wasEdit = this.editingAddress() !== null;
    this.closeForm();
    this.successMessage.set(wasEdit ? 'Address updated successfully.' : 'Address added successfully.');
  }

  onDelete(address: AddressResponse): void {
    if (this.deletingAddressId() !== null) {
      return;
    }

    const confirmed = window.confirm('Are you sure you want to delete this address?');
    if (!confirmed) {
      return;
    }

    this.clearRowError(address.id);
    this.deletingAddressId.set(address.id);
    this.successMessage.set(null);

    this.addressService.deleteAddress(address.id).subscribe({
      next: () => {
        this.deletingAddressId.set(null);
        this.successMessage.set('Address deleted successfully.');
      },
      error: (err: HttpErrorResponse) => {
        this.deletingAddressId.set(null);
        this.setRowError(address.id, resolveErrorMessage(err, { 404: 'Address not found.' }));
      },
    });
  }

  onSetDefault(address: AddressResponse): void {
    if (this.settingDefaultAddressId() !== null) {
      return;
    }

    this.clearRowError(address.id);
    this.settingDefaultAddressId.set(address.id);
    this.successMessage.set(null);

    this.addressService.setDefaultAddress(address.id).subscribe({
      next: () => {
        this.settingDefaultAddressId.set(null);
        this.successMessage.set('Default address updated.');
      },
      error: (err: HttpErrorResponse) => {
        this.settingDefaultAddressId.set(null);
        this.setRowError(address.id, resolveErrorMessage(err, { 404: 'Address not found.' }));
      },
    });
  }

  isDeleting(addressId: number): boolean {
    return this.deletingAddressId() === addressId;
  }

  isSettingDefault(addressId: number): boolean {
    return this.settingDefaultAddressId() === addressId;
  }

  rowErrorFor(addressId: number): string | null {
    return this.rowError().get(addressId) ?? null;
  }

  private loadAddresses(): void {
    this.loading.set(true);
    this.error.set(null);

    this.addressService.getAddresses().subscribe({
      next: () => this.loading.set(false),
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(resolveErrorMessage(err));
      },
    });
  }

  private setRowError(addressId: number, message: string): void {
    const next = new Map(this.rowError());
    next.set(addressId, message);
    this.rowError.set(next);
  }

  private clearRowError(addressId: number): void {
    if (!this.rowError().has(addressId)) {
      return;
    }
    const next = new Map(this.rowError());
    next.delete(addressId);
    this.rowError.set(next);
  }
}
