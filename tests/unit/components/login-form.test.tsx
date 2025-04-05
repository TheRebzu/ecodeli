import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { LoginForm } from "@/components/auth/login-form";

// Mocks pour sonner
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock pour next-auth/react
jest.mock("next-auth/react", () => ({
  signIn: jest.fn(),
}));

// Définition des mocks pour les fonctions
const mockSignInFn = jest.fn().mockResolvedValue(true);
const mockSignInWithGoogleFn = jest.fn().mockResolvedValue(true);
const mockSignInWithFacebookFn = jest.fn().mockResolvedValue(true);
const mockPushFn = jest.fn();

// Récupération des mocks pour les tests
const mockToast = require("sonner").toast;

// Mocks pour les hooks
jest.mock("@/hooks/use-auth", () => ({
  useAuth: jest.fn(() => ({
    signIn: mockSignInFn,
    signInWithGoogle: mockSignInWithGoogleFn,
    signInWithFacebook: mockSignInWithFacebookFn
  })),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: mockPushFn,
  })),
  useSearchParams: jest.fn(() => ({
    get: jest.fn().mockReturnValue(null),
  })),
}));

// Mock pour ResizeObserver qui manque en environnement de test
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Setup des mocks pour localStorage et window.scrollTo
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });
Object.defineProperty(window, "scrollTo", { value: jest.fn() });

// Tests pour le formulaire de connexion
describe("Test du formulaire de connexion", () => {
  // Configuration avant chaque test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test: Vérifier que le formulaire s'affiche correctement
  test("Le formulaire de connexion s'affiche correctement", () => {
    render(<LoginForm />);
    
    // Vérifier que les champs principaux sont présents
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mot de passe/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Se souvenir de moi/i)).toBeInTheDocument();
    
    // Vérifier que les boutons sont présents
    expect(screen.getByRole("button", { name: /Se connecter/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continuer avec Google/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continuer avec Facebook/i })).toBeInTheDocument();
    
    // Vérifier que les liens sont présents
    expect(screen.getByText(/Mot de passe oublié/i)).toBeInTheDocument();
    expect(screen.getByText(/S'inscrire/i)).toBeInTheDocument();
  });

  // Test: Vérifier la soumission du formulaire avec des identifiants valides
  test("Soumission du formulaire avec des identifiants valides", async () => {
    render(<LoginForm />);
    
    // Remplir le formulaire
    const emailInput = screen.getByLabelText(/Email/i);
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    
    const passwordInput = screen.getByLabelText(/Mot de passe/i);
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });
    
    const rememberMeCheckbox = screen.getByLabelText(/Se souvenir de moi/i);
    fireEvent.click(rememberMeCheckbox);
    
    // Soumettre le formulaire
    const submitButton = screen.getByRole("button", { name: /Se connecter/i });
    fireEvent.click(submitButton);
    
    // Vérifier que la fonction de connexion a été appelée avec les bonnes valeurs
    await waitFor(() => {
      expect(mockSignInFn).toHaveBeenCalledWith(
        "test@example.com",
        "Password123!"
      );
    });
  });
  
  // Test: Vérifier le fonctionnement du bouton Google
  test("Connexion avec Google", async () => {
    render(<LoginForm />);
    
    // Cliquer sur le bouton Google
    const googleButton = screen.getByRole("button", { name: /Continuer avec Google/i });
    fireEvent.click(googleButton);
    
    // Vérifier que la fonction de connexion Google a été appelée
    await waitFor(() => {
      expect(mockSignInWithGoogleFn).toHaveBeenCalled();
    });
  });
  
  // Test: Vérifier le fonctionnement du bouton Facebook
  test("Connexion avec Facebook", async () => {
    render(<LoginForm />);
    
    // Cliquer sur le bouton Facebook
    const facebookButton = screen.getByRole("button", { name: /Continuer avec Facebook/i });
    fireEvent.click(facebookButton);
    
    // Vérifier que la fonction de connexion Facebook a été appelée
    await waitFor(() => {
      expect(mockSignInWithFacebookFn).toHaveBeenCalled();
    });
  });
  
  // Test: Vérifier que la redirection se fait correctement après une connexion réussie
  test("Redirection après connexion réussie", async () => {
    render(<LoginForm />);
    
    // Remplir et soumettre le formulaire
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText(/Mot de passe/i), { target: { value: "Password123!" } });
    fireEvent.click(screen.getByRole("button", { name: /Se connecter/i }));
    
    // Vérifier la redirection
    await waitFor(() => {
      expect(mockPushFn).toHaveBeenCalledWith("/dashboard");
    });
  });
  
  // Test: Vérifier le traitement des erreurs lors de la connexion
  test("Gestion des erreurs lors de la connexion", async () => {
    // Simuler une erreur lors de la connexion
    mockSignInFn.mockRejectedValueOnce(new Error("Erreur de connexion"));
    
    render(<LoginForm />);
    
    // Remplir et soumettre le formulaire
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText(/Mot de passe/i), { target: { value: "Password123!" } });
    fireEvent.click(screen.getByRole("button", { name: /Se connecter/i }));
    
    // Vérifier que l'erreur est traitée
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Erreur lors de la connexion. Veuillez réessayer.");
    });
    
    // Vérifier que la redirection n'a pas lieu
    expect(mockPushFn).not.toHaveBeenCalled();
  });
}); 