expect.extend({
  toBeValidJwt(received: string) {
    const parts = typeof received === 'string' ? received.split('.') : [];
    const pass = parts.length === 3;
    return {
      message: () =>
        `expected ${received} to be a valid JWT string with 3 parts`,
      pass,
    };
  },
  toBeUuid(received: string) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = typeof received === 'string' && uuidRegex.test(received);
    return {
      message: () => `expected ${received} to be a valid UUID string`,
      pass,
    };
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidJwt(): R;
      toBeUuid(): R;
    }
  }
}
