import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CourierRegisterForm } from "@/components/auth/courier-register-form";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { UserRoleEnum, VehicleTypeEnum } from "@/lib/validations/auth.schema";
import { toast } from "sonner";
import { vi } from "vitest";

// Étendre l'interface des matchers de Jest
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
    }
  }
}

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock use-auth
const mockSignUp = vi.fn();
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    signUp: mockSignUp,
  }),
}));

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock FileUpload
vi.mock("@/components/shared/file-upload", () => ({
  FileUpload: ({ onChange }) => (
    <div data-testid="file-upload">
      <button onClick={() => onChange("https://example.com/fake-image.jpg")}>
        Simuler téléchargement
      </button>
    </div>
  ),
}));

// Mock localStorage
const mockSetItem = vi.spyOn(Storage.prototype, 'setItem');
const mockGetItem = vi.spyOn(Storage.prototype, 'getItem');

describe("CourierRegisterForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("affiche le formulaire correctement", () => {
    render(<CourierRegisterForm />);
    expect(screen.getByText("Inscription Livreur")).toBeInTheDocument();
  });

  it("affiche les champs requis", () => {
    render(<CourierRegisterForm />);
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mot de passe/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirmer le mot de passe/i)).toBeInTheDocument();
  });

  it("valide les champs requis", async () => {
    render(<CourierRegisterForm />);
    const nextButton = screen.getByText(/Suivant/i);
    fireEvent.click(nextButton);
    await waitFor(() => {
      expect(screen.getByText("L'email est requis")).toBeInTheDocument();
      expect(screen.getByText("Le mot de passe est requis")).toBeInTheDocument();
    });
  });

  it("valide la correspondance des mots de passe", async () => {
    render(<CourierRegisterForm />);
    const passwordInput = screen.getByLabelText(/Mot de passe/i);
    const confirmPasswordInput = screen.getByLabelText(/Confirmer le mot de passe/i);
    
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "password456" } });
    
    const nextButton = screen.getByText(/Suivant/i);
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByText("Les mots de passe ne correspondent pas")).toBeInTheDocument();
    });
  });

  it("Les données du formulaire sont sauvegardées dans localStorage", async () => {
    render(<CourierRegisterForm />);
    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Mot de passe/i);
    const confirmPasswordInput = screen.getByLabelText(/Confirmer le mot de passe/i);
    
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "password123" } });
    
    const nextButton = screen.getByText(/Suivant/i);
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(mockSetItem).toHaveBeenCalledWith(
        "courierFormData",
        expect.stringContaining("test@example.com")
      );
    }, { timeout: 2000 });
  });

  it("La soumission du formulaire complet fonctionne", async () => {
    render(<CourierRegisterForm />);
    
    // Remplir les champs requis
    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Mot de passe/i);
    const confirmPasswordInput = screen.getByLabelText(/Confirmer le mot de passe/i);
    
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "password123" } });
    
    // Naviguer jusqu'à la dernière étape
    for (let i = 0; i < 6; i++) {
      const nextButton = screen.getByText(/Suivant/i);
      fireEvent.click(nextButton);
      await waitFor(() => {}, { timeout: 100 });
    }
    
    // Vérifier qu'on est sur la dernière étape
    expect(screen.getByText("Conditions et finalisation")).toBeInTheDocument();
    
    // Cocher toutes les cases requises
    const checkboxes = screen.getAllByRole("checkbox");
    checkboxes.forEach(checkbox => {
      fireEvent.click(checkbox);
    });
    
    // Soumettre le formulaire
    const submitButton = screen.getByText("Créer mon compte");
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockSetItem).toHaveBeenCalledWith(
        "courierFormData",
        expect.any(String)
      );
    });
  });

  it("Les erreurs sont correctement gérées", async () => {
    mockSignUp.mockRejectedValueOnce(new Error("Erreur d'inscription"));
    
    render(<CourierRegisterForm />);
    
    // Remplir les champs requis
    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Mot de passe/i);
    const confirmPasswordInput = screen.getByLabelText(/Confirmer le mot de passe/i);
    
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "password123" } });
    
    // Naviguer jusqu'à la dernière étape
    for (let i = 0; i < 6; i++) {
      const nextButton = screen.getByText(/Suivant/i);
      fireEvent.click(nextButton);
      await waitFor(() => {}, { timeout: 100 });
    }
    
    // Cocher toutes les cases requises
    const checkboxes = screen.getAllByRole("checkbox");
    checkboxes.forEach(checkbox => {
      fireEvent.click(checkbox);
    });
    
    // Soumettre le formulaire
    const submitButton = screen.getByText("Créer mon compte");
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText("Erreur d'inscription")).toBeInTheDocument();
    });
  });
}); 