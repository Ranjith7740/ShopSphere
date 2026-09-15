import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { Login } from './login';
import { AuthService } from '../../../core/services/auth.service';

describe('Login', () => {
  let authServiceMock: { login: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authServiceMock = { login: vi.fn() };

    TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), { provide: AuthService, useValue: authServiceMock }],
    });
  });

  it('does not call the API when required fields are empty', () => {
    const fixture = TestBed.createComponent(Login);

    fixture.componentInstance.submit();

    expect(authServiceMock.login).not.toHaveBeenCalled();
    expect(fixture.componentInstance.form.invalid).toBe(true);
    expect(fixture.componentInstance.form.controls.email.touched).toBe(true);
  });

  it('navigates to "/" after a successful login', () => {
    authServiceMock.login.mockReturnValue(
      of({ accessToken: 'a.b.c', tokenType: 'Bearer', expiresInMs: 1000 }),
    );
    const fixture = TestBed.createComponent(Login);
    const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');

    fixture.componentInstance.form.setValue({ email: 'a@example.com', password: 'Passw0rd!' });
    fixture.componentInstance.submit();

    expect(navigateSpy).toHaveBeenCalledWith('/');
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.componentInstance.errorMessage()).toBeNull();
  });

  it('shows a clean message and stops loading on invalid credentials', () => {
    authServiceMock.login.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    const fixture = TestBed.createComponent(Login);

    fixture.componentInstance.form.setValue({ email: 'a@example.com', password: 'wrong' });
    fixture.componentInstance.submit();

    expect(fixture.componentInstance.errorMessage()).toBe('Invalid email or password.');
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('shows a loading state while the request is in flight and ignores a second submit', () => {
    const subject = new Subject<{ accessToken: string; tokenType: string; expiresInMs: number }>();
    authServiceMock.login.mockReturnValue(subject.asObservable());
    const fixture = TestBed.createComponent(Login);

    fixture.componentInstance.form.setValue({ email: 'a@example.com', password: 'Passw0rd!' });
    fixture.componentInstance.submit();
    fixture.componentInstance.submit();

    expect(fixture.componentInstance.loading()).toBe(true);
    expect(authServiceMock.login).toHaveBeenCalledTimes(1);

    subject.next({ accessToken: 'a.b.c', tokenType: 'Bearer', expiresInMs: 1000 });
    subject.complete();

    expect(fixture.componentInstance.loading()).toBe(false);
  });
});
