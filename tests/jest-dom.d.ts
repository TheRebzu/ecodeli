import '@testing-library/jest-dom';

declare global {
  namespace Vi {
    interface JestAssertion<T = unknown> {
      toBeInTheDocument(): T;
      toHaveAttribute(attr: string, value?: string): T;
      toHaveTextContent(text: string | RegExp): T;
      toBeVisible(): T;
      toBeDisabled(): T;
      toBeEnabled(): T;
      toBeChecked(): T;
      toBeRequired(): T;
      toBeValid(): T;
      toBeInvalid(): T;
      toHaveFocus(): T;
      toBeEmpty(): T;
      toHaveClass(className: string): T;
      toHaveStyle(css: string): T;
      toHaveValue(value: string | string[] | number): T;
      toBePartiallyChecked(): T;
      toContainElement(element: HTMLElement | null): T;
      toContainHTML(htmlText: string): T;
    }
  }
} 