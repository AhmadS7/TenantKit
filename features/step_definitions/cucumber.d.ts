declare module '@cucumber/cucumber' {
  export function Given(pattern: string | RegExp, code: Function): void;
  export function When(pattern: string | RegExp, code: Function): void;
  export function Then(pattern: string | RegExp, code: Function): void;
  export function Before(code: Function): void;
  export function After(code: Function): void;
}
