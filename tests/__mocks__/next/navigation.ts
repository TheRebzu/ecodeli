export function useRouter() {
  return {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  };
}

export function usePathname() {
  return '/test-pathname';
}

export function useSearchParams() {
  const params = new Map();
  params.set('test-key', 'test-value');
  params.set('query', 'test-query');
  
  return {
    get: (key: string) => params.get(key),
    getAll: (key: string) => [params.get(key)].filter(Boolean),
    has: (key: string) => params.has(key),
    forEach: params.forEach,
    entries: () => params.entries(),
    keys: () => params.keys(),
    values: () => params.values(),
    toString: () => 'test-key=test-value&query=test-query',
  };
}

export function redirect(url: string) {
  throw new Error(`NEXT_REDIRECT:${url}`);
} 