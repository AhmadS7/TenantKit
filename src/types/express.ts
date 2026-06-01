import 'express';

/**
 * Augments Express's `Request` with the fields populated by our auth/runtime
 * layer: `user` is set by the Passport strategies, `rawBody` by the raw-body
 * parser used for Stripe webhook signature verification.
 */
/* eslint-disable @typescript-eslint/no-namespace -- declaration merging into
   the Express namespace requires `namespace` syntax. */
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
    }

    interface Request {
      user?: User;
      rawBody?: Buffer;
    }
  }
}

export type AuthUser = Express.User;
