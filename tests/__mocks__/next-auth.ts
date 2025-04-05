import { UserRoleEnum } from "@/lib/validations/auth.schema";

const mockUser = {
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  image: 'https://example.com/avatar.jpg',
  role: UserRoleEnum.enum.LIVREUR
};

const mockSession = {
  user: mockUser,
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
};

export const useSession = jest.fn(() => ({
  data: mockSession,
  status: 'authenticated',
  update: jest.fn(),
}));

export const getSession = jest.fn(() => Promise.resolve(mockSession));
export const signIn = jest.fn(() => Promise.resolve({ ok: true, error: null }));
export const signOut = jest.fn(() => Promise.resolve(true));
export const getProviders = jest.fn(() => Promise.resolve({
  email: {
    id: 'email',
    name: 'Email',
    type: 'email',
  },
}));

export default {
  useSession,
  getSession,
  signIn,
  signOut,
  getProviders,
}; 