import { FormBuilder } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { applyServerFieldErrors, resolveErrorMessage } from './http-error.util';

describe('resolveErrorMessage', () => {
  it('uses the caller-supplied message for a matching status', () => {
    const err = new HttpErrorResponse({ status: 401 });
    expect(resolveErrorMessage(err, { 401: 'Invalid email or password.' })).toBe(
      'Invalid email or password.'
    );
  });

  it('falls back to a network message for status 0', () => {
    const err = new HttpErrorResponse({ status: 0 });
    expect(resolveErrorMessage(err)).toBe('Unable to reach the server. Please try again later.');
  });

  it('falls back to a generic message for anything else unmapped', () => {
    const err = new HttpErrorResponse({ status: 500 });
    expect(resolveErrorMessage(err, { 401: 'x' })).toBe('Something went wrong. Please try again.');
  });
});

describe('applyServerFieldErrors', () => {
  const fb = new FormBuilder();

  it('sets a "server" error on the matching control for a 400 with fieldErrors', () => {
    const form = fb.nonNullable.group({ phone: [''] });
    const err = new HttpErrorResponse({
      status: 400,
      error: { timestamp: '', status: 400, message: '', path: '', fieldErrors: { phone: 'bad phone' } }
    });

    expect(applyServerFieldErrors(form, err)).toBe(true);
    expect(form.controls.phone.getError('server')).toBe('bad phone');
  });

  it('returns false and touches nothing for a non-400 error', () => {
    const form = fb.nonNullable.group({ phone: [''] });
    const err = new HttpErrorResponse({ status: 409 });

    expect(applyServerFieldErrors(form, err)).toBe(false);
    expect(form.controls.phone.errors).toBeNull();
  });

  it('returns false for a 400 with no fieldErrors', () => {
    const form = fb.nonNullable.group({ phone: [''] });
    const err = new HttpErrorResponse({
      status: 400,
      error: { timestamp: '', status: 400, message: '', path: '', fieldErrors: null }
    });

    expect(applyServerFieldErrors(form, err)).toBe(false);
  });
});
