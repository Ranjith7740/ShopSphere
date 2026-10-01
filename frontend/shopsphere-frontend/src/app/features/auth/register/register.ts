import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { applyServerFieldErrors, resolveErrorMessage } from '../../../core/utils/http-error.util';

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&+=!]).{8,}$/;
const PHONE_PATTERN = /^[0-9]{10}$/;

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly pageLoaded = signal(false);
  readonly showPassword = signal(false);
  readonly registerSuccess = signal(false);
  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
    password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
  });

  constructor() {
    requestAnimationFrame(() => {
      this.pageLoaded.set(true);
    });
  }

  togglePassword(): void {
    this.showPassword.update((value) => !value);
  }

  submit(): void {
    if (this.loading()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.register(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        this.registerSuccess.set(true);
        /*
         * Let the user see the success animation
         * before moving to Login.
         */
        setTimeout(() => {
          this.router.navigateByUrl('/login');
        }, 1200);
      },

      error: (err: HttpErrorResponse) => {
        this.loading.set(false);

        if (applyServerFieldErrors(this.form, err)) {
          this.errorMessage.set('Please fix the highlighted fields.');
          return;
        }

        this.errorMessage.set(
          resolveErrorMessage(err, {
            409: 'An account with this email already exists.',
          }),
        );
      },
    });
  }
}
