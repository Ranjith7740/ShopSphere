import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { AddressService } from '../../../core/services/address.service';
import { AddressResponse, AddressType } from '../../../core/models/address.model';
import { applyServerFieldErrors, resolveErrorMessage } from '../../../core/utils/http-error.util';

const PHONE_PATTERN = /^[0-9]{10}$/;
const POSTAL_CODE_PATTERN = /^[0-9]{4,10}$/;

/**
 * Reusable create/edit form. Owns its own submission: when `address` is set
 * it calls AddressService.updateAddress, otherwise createAddress. Either way
 * it emits the backend's response on `saved` rather than fabricating one, so
 * the parent list never has to guess at server-decided fields (id, isDefault).
 */
@Component({
  selector: 'app-address-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './address-form.html',
  styleUrl: './address-form.css',
})
export class AddressForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly addressService = inject(AddressService);

  readonly address = input<AddressResponse | null>(null);

  readonly saved = output<AddressResponse>();
  readonly cancelled = output<void>();

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(100)]],
    phone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
    addressLine1: ['', [Validators.required, Validators.maxLength(255)]],
    addressLine2: ['', [Validators.maxLength(255)]],
    city: ['', [Validators.required, Validators.maxLength(100)]],
    state: ['', [Validators.required, Validators.maxLength(100)]],
    postalCode: ['', [Validators.required, Validators.pattern(POSTAL_CODE_PATTERN)]],
    country: ['', [Validators.required, Validators.maxLength(100)]],
    type: ['HOME' as AddressType, [Validators.required]],
    isDefault: [false],
  });

  get isEditMode(): boolean {
    return this.address() !== null;
  }

  ngOnInit(): void {
    const existing = this.address();
    if (existing) {
      this.form.patchValue({
        fullName: existing.fullName,
        phone: existing.phone,
        addressLine1: existing.addressLine1,
        addressLine2: existing.addressLine2 ?? '',
        city: existing.city,
        state: existing.state,
        postalCode: existing.postalCode,
        country: existing.country,
        type: existing.type,
        isDefault: existing.isDefault,
      });
    }
  }

  submit(): void {
    if (this.saving()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    const raw = this.form.getRawValue();
    const request = {
      fullName: raw.fullName,
      phone: raw.phone,
      addressLine1: raw.addressLine1,
      addressLine2: raw.addressLine2 || undefined,
      city: raw.city,
      state: raw.state,
      postalCode: raw.postalCode,
      country: raw.country,
      type: raw.type,
      isDefault: raw.isDefault,
    };

    const existing = this.address();
    const request$ = existing
      ? this.addressService.updateAddress(existing.id, request)
      : this.addressService.createAddress(request);

    request$.subscribe({
      next: (response) => {
        this.saving.set(false);
        this.saved.emit(response);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);

        if (applyServerFieldErrors(this.form, err)) {
          this.errorMessage.set('Please fix the highlighted fields.');
          return;
        }

        this.errorMessage.set(resolveErrorMessage(err, { 404: 'Address not found.' }));
      },
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
