import { HttpErrorResponse } from '@angular/common/http';
import { FormGroup } from '@angular/forms';

import { ApiError } from '../models/api-error.model';

const NETWORK_ERROR_MESSAGE = 'Unable to reach the server. Please try again later.';
const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

/**
 * Turns a backend error into a message safe to show a user, without ever exposing
 * the raw response. `statusMessages` lets a caller override the message for the
 * status codes it cares about (e.g. 401 on login, 409 on register); anything else
 * falls back to a network-vs-generic message so no component has to reinvent that.
 */
export function resolveErrorMessage(
  err: HttpErrorResponse,
  statusMessages: Record<number, string> = {},
): string {
  if (statusMessages[err.status]) {
    return statusMessages[err.status];
  }

  if (err.status === 0) {
    return NETWORK_ERROR_MESSAGE;
  }

  return GENERIC_ERROR_MESSAGE;
}

/**
 * Maps a 400 validation response's per-field messages (see ErrorResponse.fieldErrors
 * on the backend) onto the matching form controls, so the template can show them the
 * same way it shows client-side validation errors. Returns false (and does nothing)
 * for any other status or shape, so callers can fall back to resolveErrorMessage.
 */
export function applyServerFieldErrors(form: FormGroup, err: HttpErrorResponse): boolean {
  if (err.status !== 400) {
    return false;
  }

  const fieldErrors = (err.error as ApiError | undefined)?.fieldErrors;
  if (!fieldErrors) {
    return false;
  }

  for (const [field, message] of Object.entries(fieldErrors)) {
    form.get(field)?.setErrors({ server: message });
  }

  return true;
}
