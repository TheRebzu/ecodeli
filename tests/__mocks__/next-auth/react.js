const nextAuthReact = jest.createMockFromModule('next-auth/react');

// Mock the useSession hook
nextAuthReact.useSession = jest.fn(() => ({
  data: {
    user: {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      role: 'USER',
    },
    expires: '2100-01-01T00:00:00.000Z',
  },
  status: 'authenticated',
  update: jest.fn(),
}));

// Mock the signIn function
nextAuthReact.signIn = jest.fn();

// Mock the signOut function
nextAuthReact.signOut = jest.fn();

module.exports = nextAuthReact; 