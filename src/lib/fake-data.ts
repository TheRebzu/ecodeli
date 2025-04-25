/**
 * This file contains utility functions to generate fake data for testing the registration forms.
 * In a real application, this should be replaced with actual API calls.
 */

import { type Role } from "@/types/next-auth";

// Simulate a network delay
export const simulateNetworkDelay = (ms = 1000) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Simulate user registration
export const registerUser = async (userData: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: Role;
  [key: string]: any;
}) => {
  // Simulate API call delay
  await simulateNetworkDelay(1500);

  // In development mode, log the data that would be sent to the server
  if (process.env.NODE_ENV !== "production") {
    console.log("Registration data:", {
      ...userData,
      password: "[REDACTED]",
    });
  }

  // Simulate successful registration
  // In a real app, this would be an API call to the server
  return {
    success: true,
    message:
      "Votre compte a été créé avec succès. Un email de confirmation vous a été envoyé.",
    userId: "fake-user-id-" + Math.random().toString(36).substring(2, 9),
  };
};

// Simulate email verification
export const verifyEmail = async (token: string) => {
  await simulateNetworkDelay(1000);

  // In a real app, this would verify the token with the server
  const isValid = token.length > 10;

  return {
    success: isValid,
    message: isValid
      ? "Votre adresse email a été vérifiée avec succès. Vous pouvez maintenant vous connecter."
      : "Le lien de vérification est invalide ou a expiré.",
  };
};

// Simulate login
export const loginUser = async (email: string, password: string) => {
  await simulateNetworkDelay(1000);

  // In a real app, this would authenticate with the server
  const isValid = email.includes("@") && password.length >= 8;

  return {
    success: isValid,
    message: isValid
      ? "Connexion réussie."
      : "Email ou mot de passe incorrect.",
    token: isValid
      ? "fake-auth-token-" + Math.random().toString(36).substring(2, 9)
      : null,
  };
};

// Simulate password reset request
export const requestPasswordReset = async (email: string) => {
  await simulateNetworkDelay(1000);

  // In a real app, this would send a reset email via the server
  const isValid = email.includes("@");

  return {
    success: isValid,
    message: isValid
      ? "Un email a été envoyé avec les instructions pour réinitialiser votre mot de passe."
      : "Adresse email invalide.",
  };
};

// Simulate password reset
export const resetPassword = async (token: string, newPassword: string) => {
  await simulateNetworkDelay(1500);

  // In a real app, this would verify the token and update the password
  const isValidToken = token.length > 10;
  const isValidPassword = newPassword.length >= 8;

  return {
    success: isValidToken && isValidPassword,
    message:
      isValidToken && isValidPassword
        ? "Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter."
        : "Le lien de réinitialisation est invalide ou a expiré.",
  };
};
