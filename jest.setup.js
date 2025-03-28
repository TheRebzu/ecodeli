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

// Mock Next-Auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock Prisma
jest.mock('@/lib/prisma', () => {
  const mockPrisma = {
    tutorial: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn().mockResolvedValue({ id: '123' }),
      count: jest.fn(),
    },
    tutorialLike: {
      findUnique: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    savedTutorial: {
      findUnique: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    tutorialComment: {
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    tutorialCategory: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };
  
  mockPrisma.$transaction = jest.fn(async (callback) => {
    if (typeof callback === 'function') {
      return await callback(mockPrisma);
    }
    return Promise.all(callback);
  });
  
  return {
    __esModule: true,
    default: mockPrisma
  };
});

// Reset all mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
}); 