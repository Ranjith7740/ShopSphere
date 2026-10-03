import { Component, inject, signal } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { HttpErrorResponse } from '@angular/common/http';

import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

import { resolveErrorMessage } from '../../../core/utils/http-error.util';

@Component({
  selector: 'app-login',

  standalone: true,

  imports: [ReactiveFormsModule, RouterLink],

  templateUrl: './login.html',

  styleUrl: './login.css',
})
export class Login {
  private readonly fb = inject(FormBuilder);

  private readonly route = inject(ActivatedRoute);

  private readonly authService = inject(AuthService);

  private readonly router = inject(Router);

  readonly loading = signal(false);

  readonly errorMessage = signal<string | null>(null);

  readonly pageLoaded = signal(false);

  readonly showPassword = signal(false);

  readonly loginSuccess = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],

    password: ['', [Validators.required]],
  });

  constructor() {
    /*

     * Small delay allows the CSS entrance animation

     * to start after the page is rendered.

     */

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

    this.authService

      .login(this.form.getRawValue())

      .subscribe({
        next: () => {
          this.loading.set(false);

          /*

           * Backend login succeeded.

           * Show the success animation before navigating.

           */

          this.loginSuccess.set(true);

          setTimeout(() => {
  const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

  if (returnUrl && returnUrl.startsWith('/')) {
    this.router.navigateByUrl(returnUrl);
    return;
  }

  const role = this.authService.getRole();

  if (role === 'ADMIN') {
    this.router.navigateByUrl('/admin');
  } else {
    this.router.navigateByUrl('/');
  }
}, 900);
        },

        error: (err: HttpErrorResponse) => {
          this.loading.set(false);

          this.errorMessage.set(
            resolveErrorMessage(err, {
              401: 'Invalid email or password.',
            }),
          );
        },
      });
  }
}
