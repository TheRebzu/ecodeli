import { useAuth } from "@/hooks/use-auth";
import { renderHook, act } from "@testing-library/react";
import '@testing-library/jest-dom';

// Mock de fetch pour simuler les appels API
global.fetch = jest.fn();

describe("Test d'authentification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('devrait appeler l\'API pour l\'inscription avec les bons paramètres', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
      role: 'LIVREUR',
      phone: '0612345678'
    };
    
    // Mock de la réponse de l'API
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, message: 'Utilisateur créé avec succès' })
    });
    
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      await result.current.signUp(userData);
    });
    
    // Vérifier que fetch a été appelé avec les bons paramètres
    expect(global.fetch).toHaveBeenCalledWith('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
  });
  
  it('devrait appeler l\'API pour la connexion avec les bons paramètres', async () => {
    const credentials = {
      email: 'test@example.com',
      password: 'Password123!'
    };
    
    // Mock de la réponse de l'API
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, user: { id: '1', email: 'test@example.com' } })
    });
    
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      await result.current.signIn(credentials);
    });
    
    // Vérifier que fetch a été appelé avec les bons paramètres
    expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });
  });
  
  it('devrait gérer les erreurs lors de la connexion', async () => {
    const credentials = {
      email: 'test@example.com',
      password: 'WrongPassword123!'
    };
    
    // Mock de la réponse d'erreur
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false, message: 'Email ou mot de passe incorrect' })
    });
    
    const { result } = renderHook(() => useAuth());
    
    // Act et vérifier que l'erreur est levée
    await expect(
      act(async () => {
        await result.current.signIn(credentials);
      })
    ).rejects.toThrow('Email ou mot de passe incorrect');
  });
}); 