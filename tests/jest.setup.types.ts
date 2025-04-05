import '@jest/globals';

declare global {
  namespace jest {
    interface Mock<T = any, Y extends any[] = any> {
      mockClear(): this;
      mockReset(): this;
      mockImplementation(fn: (...args: Y) => T): this;
      mockImplementationOnce(fn: (...args: Y) => T): this;
      mockReturnValue(value: T): this;
      mockReturnValueOnce(value: T): this;
      mockResolvedValue(value: Awaited<T>): this;
      mockResolvedValueOnce(value: Awaited<T>): this;
      mockRejectedValue(value: any): this;
      mockRejectedValueOnce(value: any): this;
    }
  }
}

// This helps with TypeScript+Jest type casting
export const mockFunction = jest.fn as jest.Mock; 