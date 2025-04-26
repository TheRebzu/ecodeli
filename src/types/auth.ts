import { UserRole } from '@/schemas/auth/register.schema';
import { ClientRegisterSchemaType } from '@/schemas/auth/client-register.schema';
import { DelivererRegisterSchemaType } from '@/schemas/auth/deliverer-register.schema';
import { MerchantRegisterSchemaType } from '@/schemas/auth/merchant-register.schema';
import { ProviderRegisterSchemaType } from '@/schemas/auth/provider-register.schema';

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
  registerDeliverer: (data: DelivererRegisterSchemaType) => Promise<AuthResponse>;

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
  resetPassword: (token: string, password: string, confirmPassword: string) => Promise<AuthResponse>;

  /**
   * Vérification d'email
   */
  verifyEmail: (token: string) => Promise<AuthResponse>;
} 