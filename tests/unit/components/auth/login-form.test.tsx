import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/components/auth/login-form';
import { useAuth } from '@/hooks/use-auth';

// Mock des hooks
vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('LoginForm', () => {
  const mockLogin = vi.fn();
  
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      login: mockLogin,
      error: null,
      isLoading: false,
    });
  });

  it('devrait rendre le formulaire de connexion', () => {
    // Arrange & Act
    render(<LoginForm />);
    
    // Assert
    expect(screen.getByText('Connexion')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connexion' })).toBeInTheDocument();
  });

  it('devrait afficher les erreurs de validation', async () => {
    // Arrange
    render(<LoginForm />);
    const user = userEvent.setup();
    
    // Act
    await user.click(screen.getByRole('button', { name: 'Connexion' }));
    
    // Assert
    await waitFor(() => {
      expect(screen.getByText('L\'email est requis')).toBeInTheDocument();
      expect(screen.getByText('Le mot de passe est requis')).toBeInTheDocument();
    });
  });

  it('devrait appeler login avec les identifiants correctement', async () => {
    // Arrange
    mockLogin.mockResolvedValueOnce(true);
    render(<LoginForm />);
    const user = userEvent.setup();
    
    // Act
    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Mot de passe'), 'Password123!');
    await user.click(screen.getByRole('button', { name: 'Connexion' }));
    
    // Assert
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!',
        rememberMe: false,
        totp: '',
      }, '/');
    });
  });

  it('devrait afficher l\'interface 2FA si nécessaire', async () => {
    // Arrange
    mockLogin.mockResolvedValueOnce(false);
    vi.mocked(useAuth).mockReturnValue({
      login: mockLogin,
      error: 'Vérification 2FA requise',
      isLoading: false,
    });
    
    render(<LoginForm />);
    const user = userEvent.setup();
    
    // Act
    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Mot de passe'), 'Password123!');
    await user.click(screen.getByRole('button', { name: 'Connexion' }));
    
    // Assert
    await waitFor(() => {
      expect(screen.getByLabelText('Code d\'authentification')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Vérifier' })).toBeInTheDocument();
    });
  });
});
