import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LoginForm } from '@/components/auth/login-form';
import { ClientRegistrationForm } from '@/components/auth/register-forms/client-form';
import { PasswordResetForm } from '@/components/auth/password-reset';

// Mock hooks
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    login: vi.fn().mockResolvedValue({ success: true }),
    registerClient: vi.fn().mockResolvedValue({ success: true }),
    resetPassword: vi.fn().mockResolvedValue({ success: true }),
    isLoading: false,
    error: null
  })
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn().mockReturnValue({
    push: vi.fn(),
    refresh: vi.fn()
  }),
  useSearchParams: vi.fn().mockReturnValue({
    get: vi.fn().mockImplementation(key => key === 'token' ? 'valid-token' : null)
  })
}));

describe('Authentification', () => {
  describe('LoginForm', () => {
    it('should render login form', () => {
      render(<LoginForm />);
      
      expect(screen.getByLabelText(/emailLabel/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/passwordLabel/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    });
    
    it('should handle form submission', async () => {
      render(<LoginForm />);
      
      fireEvent.change(screen.getByLabelText(/emailLabel/i), {
        target: { value: 'test@example.com' }
      });
      
      fireEvent.change(screen.getByLabelText(/passwordLabel/i), {
        target: { value: 'password123' }
      });
      
      fireEvent.click(screen.getByRole('button', { name: /submit/i }));
      
      // Assertions pour vérifier les appels de hooks seraient ici
    });
  });
  
  describe('ClientRegistrationForm', () => {
    it('should render registration form', () => {
      render(<ClientRegistrationForm />);
      
      expect(screen.getByLabelText(/nameLabel/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/emailLabel/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/passwordLabel/i)).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
  
  describe('PasswordResetForm', () => {
    it('should render password reset form', () => {
      render(<PasswordResetForm />);
      
      expect(screen.getByLabelText(/passwordLabel/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirmPasswordLabel/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    });
  });
});