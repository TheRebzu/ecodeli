import type { ClientRegisterSchemaType } from "@/schemas/client/client-register.schema";
import type { DelivererRegisterSchemaType } from "@/schemas/deliverer/deliverer-register.schema";
import type { MerchantRegisterSchemaType } from "@/schemas/merchant/merchant-register.schema";
import type { ProviderRegisterSchemaType } from "@/schemas/provider/provider-register.schema";

export interface AuthResponse {
  success: boolean;
  error?: string;
  userId?: string;
}

export interface AuthService {
  /**
   * Inscription d'un client
   */
  registerClient: (data: ClientRegisterSchemaType) => Promise<AuthResponse>;

  /**
   * Inscription d'un livreur
   */
  registerDeliverer: (
    data: DelivererRegisterSchemaType,
  ) => Promise<AuthResponse>;

  /**
   * Inscription d'un commerçant
   */
  registerMerchant: (data: MerchantRegisterSchemaType) => Promise<AuthResponse>;

  /**
   * Inscription d'un prestataire
   */
  registerProvider: (data: ProviderRegisterSchemaType) => Promise<AuthResponse>;

  /**
   * Connexion d'un utilisateur
   */
  login: (email: string, password: string) => Promise<AuthResponse>;

  /**
   * Déconnexion de l'utilisateur
   */
  logout: () => Promise<void>;

  /**
   * Demande de réinitialisation de mot de passe
   */
  forgotPassword: (email: string) => Promise<AuthResponse>;

  /**
   * Réinitialisation de mot de passe
   */
  resetPassword: (
    token: string,
    password: string,
    confirmPassword: string,
  ) => Promise<AuthResponse>;

  /**
   * Vérification d'email
   */
  verifyEmail: (token: string) => Promise<AuthResponse>;
}

// Export the imported types for convenience
export type {
  ClientRegisterSchemaType,
  DelivererRegisterSchemaType,
  MerchantRegisterSchemaType,
  ProviderRegisterSchemaType,
};
