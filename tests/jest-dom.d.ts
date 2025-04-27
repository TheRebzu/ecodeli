// Define custom assertion types for Vitest
declare namespace Vi {
  interface Assertion<T = unknown> {
    toBeDefined(): T;
    toBeNull(): T;
    toBeTruthy(): T;
    toBeFalsy(): T;
    toBeUndefined(): T;
    toStrictEqual(expected: unknown): T;
    toEqual(expected: unknown): T;
  }
}
