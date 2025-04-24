import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';

// Mock des dépendances
vi.mock('next-auth/react', () => ({
  useSession: vi.fn()
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn()
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key) => key
}));

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('redirects to login when user is not authenticated', () => {
    const mockUseSession = useSession as jest.Mock;
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated'
    });
    
    const mockRedirect = redirect as jest.Mock;
    
    render(
      <AuthGuard requireAuth={true}>
        <div>Protected Content</div>
      </AuthGuard>
    );
    
    expect(mockRedirect).toHaveBeenCalledWith(expect.stringContaining('/login'));
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  test('shows loading state when session is loading', () => {
    const mockUseSession = useSession as jest.Mock;
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading'
    });
    
    render(
      <AuthGuard requireAuth={true}>
        <div>Protected Content</div>
      </AuthGuard>
    );
    
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  test('renders children when user is authenticated', () => {
    const mockUseSession = useSession as jest.Mock;
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'user123',
          name: 'Test User',
          email: 'test@example.com',
          role: 'CLIENT'
        },
        expires: '2023-01-01'
      },
      status: 'authenticated'
    });
    
    render(
      <AuthGuard requireAuth={true}>
        <div>Protected Content</div>
      </AuthGuard>
    );
    
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  test('redirects when user does not have required role', () => {
    const mockUseSession = useSession as jest.Mock;
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'user123',
          name: 'Test User',
          email: 'test@example.com',
          role: 'CLIENT'
        },
        expires: '2023-01-01'
      },
      status: 'authenticated'
    });
    
    const mockRedirect = redirect as jest.Mock;
    
    render(
      <AuthGuard requireAuth={true} allowedRoles={['ADMIN']}>
        <div>Admin Content</div>
      </AuthGuard>
    );
    
    expect(mockRedirect).toHaveBeenCalledWith('/client/dashboard');
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  test('renders children when user has required role', () => {
    const mockUseSession = useSession as jest.Mock;
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'user123',
          name: 'Test User',
          email: 'test@example.com',
          role: 'ADMIN'
        },
        expires: '2023-01-01'
      },
      status: 'authenticated'
    });
    
    render(
      <AuthGuard requireAuth={true} allowedRoles={['ADMIN']}>
        <div>Admin Content</div>
      </AuthGuard>
    );
    
    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });
});
