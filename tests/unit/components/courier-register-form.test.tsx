import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CourierRegisterForm } from "@/components/auth/courier-register-form";

// Mocks
jest.mock("@/hooks/use-auth", () => ({
  useAuth: jest.fn(() => ({
    signUp: jest.fn().mockResolvedValue(true)
  })),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock pour FileUpload
jest.mock("@/components/shared/file-upload", () => ({
  FileUpload: jest.fn().mockImplementation(({ onChange }) => (
    <div data-testid="mock-file-upload">
      <button onClick={() => onChange?.("https://example.com/fake-image.jpg")}>
        Simuler téléchargement
      </button>
    </div>
  )),
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

// Tests pour le formulaire d'inscription des livreurs
describe("Test du formulaire d'inscription des livreurs", () => {
  // Configuration avant chaque test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test: Vérifier que le formulaire s'affiche correctement
  test("Le formulaire d'inscription des livreurs s'affiche correctement", () => {
    render(<CourierRegisterForm />);
    
    // Vérifier que le titre du formulaire est affiché
    expect(screen.getByText(/Créez votre compte livreur/i)).toBeInTheDocument();
    
    // Vérifier que les champs principaux sont présents
    expect(screen.getByTestId("email-input")).toBeInTheDocument();
    expect(screen.getByTestId("password-input")).toBeInTheDocument();
    expect(screen.getByTestId("confirm-password-input")).toBeInTheDocument();
    
    // Vérifier que les boutons de navigation sont présents
    expect(screen.getByRole("button", { name: /Suivant/i })).toBeInTheDocument();
  });
}); 