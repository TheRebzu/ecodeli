import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { LoginForm } from '@/components/auth/login-form';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Mock des dépendances
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
  useSession: vi.fn().mockReturnValue({
    data: null,
    status: 'unauthenticated'
  })
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn().mockReturnValue({
    push: vi.fn(),
    refresh: vi.fn()
  }),
  useSearchParams: vi.fn().mockReturnValue({
    get: vi.fn().mockReturnValue(null)
  })
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key) => key.split('.').pop()
}));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders login form correctly', () => {
    render(<LoginForm />);
    
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('title');
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    expect(screen.getByText(/forgotPassword/i)).toBeInTheDocument();
    expect(screen.getByText(/noAccount/i)).toBeInTheDocument();
    expect(screen.getByText(/register/i)).toBeInTheDocument();
  });

  test('submits form with valid credentials', async () => {
    const mockSignIn = signIn as jest.Mock;
    mockSignIn.mockResolvedValueOnce({ ok: true, error: null });
    
    const mockRouter = useRouter() as jest.Mock;
    
    render(<LoginForm />);
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('credentials', {
        email: 'test@example.com',
        password: 'password123',
        redirect: false
      });
      expect(mockRouter.push).toHaveBeenCalled();
      expect(mockRouter.refresh).toHaveBeenCalled();
    });
  });

  test('shows error message on failed login', async () => {
    const mockSignIn = signIn as jest.Mock;
    mockSignIn.mockResolvedValueOnce({ ok: false, error: 'CredentialsSignin' });
    
    render(<LoginForm />);
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'wrongpassword' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('credentials', {
        email: 'test@example.com',
        password: 'wrongpassword',
        redirect: false
      });
      expect(screen.getByText(/default/i)).toBeInTheDocument();
    });
  });
});
