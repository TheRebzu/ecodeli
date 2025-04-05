const authCore = jest.createMockFromModule('@auth/core');

// Mock the Auth class
authCore.Auth = jest.fn();

// Mock customFetch
authCore.customFetch = jest.fn();

module.exports = authCore; 