import { prisma } from "@/lib/db";

export class ProviderValidationService {
  async submitCertifications(
    userId: string,
    certifications: {
      type: string;
      file: string;
      expiryDate?: Date;
    }[],
  ) {
    // Soumission des certifications
  }

  async validateProvider(userId: string, adminId: string) {
    // Validation du prestataire
  }

  async setServiceRates(userId: string, rates: any) {
    // Configuration des tarifs négociés
  }
}

export const providerValidationService = new ProviderValidationService();
