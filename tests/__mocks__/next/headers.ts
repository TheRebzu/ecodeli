export function headers() {
  const headersList = new Map();
  headersList.set('user-agent', 'jest-test');
  headersList.set('content-type', 'application/json');
  headersList.set('host', 'localhost:3000');
  
  return {
    get: (key: string) => headersList.get(key),
    has: (key: string) => headersList.has(key),
    entries: () => headersList.entries(),
    keys: () => headersList.keys(),
    values: () => headersList.values(),
    forEach: headersList.forEach,
  };
}

export function cookies() {
  let cookieStore = new Map();
  
  // Initialiser avec quelques cookies par défaut
  cookieStore.set('token', 'test-token');
  cookieStore.set('theme', 'light');
  
  return {
    get: (key: string) => {
      const value = cookieStore.get(key);
      return value ? { name: key, value } : undefined;
    },
    getAll: () => Array.from(cookieStore.entries()).map(([name, value]) => ({ name, value })),
    set: (key: string | { name: string; value: string; options?: any }, value?: string, options?: any) => {
      if (typeof key === 'object') {
        cookieStore.set(key.name, key.value);
      } else if (typeof key === 'string' && value) {
        cookieStore.set(key, value);
      }
    },
    delete: (key: string) => {
      cookieStore.delete(key);
    },
    has: (key: string) => cookieStore.has(key),
  };
} 