const nextAuth = jest.createMockFromModule('next-auth');

// Mock the Auth object
nextAuth.Auth = jest.fn();

// Mock the signIn function
nextAuth.signIn = jest.fn().mockResolvedValue({ ok: true });

// Mock the signOut function
nextAuth.signOut = jest.fn().mockResolvedValue({ ok: true });

// Mock the getServerSession function as a jest.fn() so it can be used with mockImplementation
nextAuth.getServerSession = jest.fn().mockImplementation(() => {
  return {
    user: {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      role: 'USER',
    }
  };
});

// Mock other functions as needed
nextAuth.customFetch = jest.fn();

module.exports = {
  ...nextAuth,
  getServerSession: nextAuth.getServerSession,
  signIn: nextAuth.signIn,
  signOut: nextAuth.signOut,
  Auth: nextAuth.Auth,
  default: nextAuth,
}; 