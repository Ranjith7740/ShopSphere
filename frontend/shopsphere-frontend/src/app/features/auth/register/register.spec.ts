import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { Register } from './register';
import { AuthService } from '../../../core/services/auth.service';
import { UserResponse } from '../../../core/models/user.model';

const VALID_FORM = {
  name: 'Test User',
  email: 'a@example.com',
  phone: '9876543210',
  password: 'Passw0rd!'
};

describe('Register', () => {
  let authServiceMock: { register: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authServiceMock = { register: vi.fn() };

    TestBed.configureTestingModule({
      imports: [Register],
      providers: [provideRouter([]), { provide: AuthService, useValue: authServiceMock }]
    });
  });

  it('does not call the API when required fields are empty', () => {
    const fixture = TestBed.createComponent(Register);

    fixture.componentInstance.submit();

    expect(authServiceMock.register).not.toHaveBeenCalled();
    expect(fixture.componentInstance.form.invalid).toBe(true);
    expect(fixture.componentInstance.form.controls.name.touched).toBe(true);
  });

  it('rejects a password that does not meet the backend policy', () => {
    const fixture = TestBed.createComponent(Register);

    fixture.componentInstance.form.setValue({ ...VALID_FORM, password: 'weak' });

    expect(fixture.componentInstance.form.controls.password.invalid).toBe(true);
  });

  it('navigates to "/login" after a successful registration', () => {
    const created: UserResponse = { id: 1, name: 'Test User', email: 'a@example.com', phone: '9876543210', role: 'CUSTOMER' };
    authServiceMock.register.mockReturnValue(of(created));
    const fixture = TestBed.createComponent(Register);
    const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');

    fixture.componentInstance.form.setValue(VALID_FORM);
    fixture.componentInstance.submit();

    expect(navigateSpy).toHaveBeenCalledWith('/login');
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('shows a clean message on duplicate email (409)', () => {
    authServiceMock.register.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    const fixture = TestBed.createComponent(Register);

    fixture.componentInstance.form.setValue(VALID_FORM);
    fixture.componentInstance.submit();

    expect(fixture.componentInstance.errorMessage()).toBe('An account with this email already exists.');
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('maps server-side field errors (400) onto the matching form controls', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: {
        timestamp: '2026-01-01T00:00:00',
        status: 400,
        message: 'Validation failed',
        path: '/api/auth/register',
        fieldErrors: { phone: 'Phone must be exactly 10 digits' }
      }
    });
    authServiceMock.register.mockReturnValue(throwError(() => error));
    const fixture = TestBed.createComponent(Register);

    fixture.componentInstance.form.setValue(VALID_FORM);
    fixture.componentInstance.submit();

    expect(fixture.componentInstance.form.controls.phone.getError('server')).toBe('Phone must be exactly 10 digits');
    expect(fixture.componentInstance.errorMessage()).toBe('Please fix the highlighted fields.');
  });
});
