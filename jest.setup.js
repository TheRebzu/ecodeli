// Configurer l'environnement de test pour les composants React
import '@testing-library/jest-dom';
import 'whatwg-fetch';
import { TextEncoder, TextDecoder } from 'util';

// Polyfills pour Next.js
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock Next.js modules
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options = {}) => {
      const response = {
        data,
        status: options.status || 200,
        json: function() {
          return Promise.resolve(this.data);
        }
      };
      return response;
    }),
  },
  NextRequest: jest.fn(function (input, init) {
    this.url = input || 'http://localhost:3000';
    this.json = jest.fn().mockImplementation(() => Promise.resolve({}));
    this.nextUrl = new URL(this.url);
    this.headers = new Headers(init?.headers);
  }),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
    };
  },
  usePathname() {
    return '/';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt} />;
  },
}));

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock ResizeObserver
const mockResizeObserver = jest.fn();
mockResizeObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.ResizeObserver = mockResizeObserver;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Supprime les warnings de console pendant les tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args) => {
    if (
      /Warning/.test(args[0]) ||
      /Not implemented/.test(args[0]) ||
      /Invalid DOM property/.test(args[0]) ||
      /Unknown event handler property/.test(args[0]) ||
      /React does not recognize the.*prop on a DOM element/.test(args[0]) ||
      /Each child in a list should have a unique "key" prop/.test(args[0])
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args) => {
    if (
      /Warning/.test(args[0]) ||
      /Not implemented/.test(args[0]) ||
      /Invalid DOM property/.test(args[0]) ||
      /Unknown event handler property/.test(args[0])
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Mock next-auth module
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
  getServerSession: jest.fn(() => ({
    user: {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      role: 'USER',
    },
  })),
}));

// Mock next-auth/react module
jest.mock('next-auth/react', () => ({
  __esModule: true,
  signIn: jest.fn().mockResolvedValue({ ok: true }),
  signOut: jest.fn().mockResolvedValue(true),
  useSession: jest.fn(() => ({
    data: { 
      user: { 
        id: 'test-user-id',
        name: 'Test User', 
        email: 'test@example.com',
        role: 'USER',
      }
    },
    status: 'authenticated',
    update: jest.fn(),
  })),
}));

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  profile: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  driverProfile: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  // Add other models as needed
};

jest.mock('@/lib/prisma', () => {
  return {
    __esModule: true,
    default: mockPrisma,
  };
});

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockImplementation(() => Promise.resolve('hashed_password')),
  compare: jest.fn().mockImplementation(() => Promise.resolve(true)),
}));

// Mock useTranslation hook
jest.mock('next-intl', () => ({
  useTranslations: jest.fn().mockImplementation(() => (key) => key),
  useLocale: jest.fn().mockReturnValue('fr'),
}));

// Configurer matchMedia pour jsdom
if (typeof window !== 'undefined') {
  // LocalStorage mock
  if (!window.localStorage) {
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
    });
  }

  // ScrollTo mock
  if (!window.scrollTo) {
    Object.defineProperty(window, 'scrollTo', {
      value: jest.fn(),
    });
  }
}

// Reset all mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
}); 