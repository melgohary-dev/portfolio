/**
 * Domain error for expected billing failures (unknown plan, missing Stripe
 * setup, webhook signature mismatch). The API layer maps these to ApiError so
 * the HTTP surface stays stable (code + status) regardless of billing internals.
 */
export class BillingError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = 'BillingError';
    this.code = code;
    this.status = status;
  }
}
