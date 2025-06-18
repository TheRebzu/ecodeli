import { randomBytes, randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";

export class SecureCodeGeneratorService {
  constructor(private prisma?: PrismaClient) {}

  /**
   * Génère un code de libération d'escrow sécurisé (6 chiffres)
   */
  generateEscrowReleaseCode(): string {
    // Utilise crypto.randomBytes pour une génération cryptographiquement sécurisée
    const buffer = randomBytes(4);
    const num = buffer.readUInt32BE(0);
    
    // Assurer un code de 6 chiffres entre 100000 et 999999
    const code = (num % 900000) + 100000;
    return code.toString();
  }

  /**
   * Génère un code alphanumérique sécurisé de longueur spécifiée
   */
  generateAlphanumericCode(length: number = 8): string {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const buffer = randomBytes(length);
    
    let code = "";
    for (let i = 0; i < length; i++) {
      code += characters[buffer[i] % characters.length];
    }
    
    return code;
  }

  /**
   * Génère un code d'accès pour les boîtes de stockage (6 caractères alphanumériques)
   */
  async generateBoxAccessCode(): Promise<string> {
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      code = this.generateAlphanumericCode(6);
      attempts++;
      
      // Vérifier l'unicité si Prisma est disponible
      if (this.prisma) {
        const existing = await this.prisma.boxReservation.findFirst({
          where: { accessCode: code }
        });
        
        if (!existing) break;
      } else {
        break; // Si pas de Prisma, on fait confiance à la probabilité faible de collision
      }
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new Error("Impossible de générer un code d'accès unique après plusieurs tentatives");
    }

    return code;
  }

  /**
   * Génère un identifiant unique pour les ordres de cart-drop
   */
  generateCartDropOrderId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = this.generateAlphanumericCode(4);
    return `CART-${timestamp}-${randomPart}`;
  }

  /**
   * Génère un identifiant de transaction escrow
   */
  generateEscrowTransactionId(): string {
    const uuid = randomUUID().replace(/-/g, "");
    return `escrow_${Date.now()}_${uuid.substr(0, 9)}`;
  }

  /**
   * Génère un identifiant de tâche planifiée
   */
  generateTaskId(): string {
    const uuid = randomUUID().replace(/-/g, "");
    return `task_${Date.now()}_${uuid.substr(0, 9)}`;
  }

  /**
   * Génère un identifiant d'événement workflow
   */
  generateEventId(): string {
    const uuid = randomUUID().replace(/-/g, "");
    return `evt_${Date.now()}_${uuid.substr(0, 9)}`;
  }

  /**
   * Génère un numéro de contrat unique
   */
  generateContractNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomPart = this.generateAlphanumericCode(5);
    return `CT-${timestamp}-${randomPart}`;
  }

  /**
   * Génère un identifiant de paiement avec fallback
   */
  generatePaymentFallbackId(): string {
    const timestamp = Date.now();
    const randomPart = randomUUID().substring(2, 10);
    return `pi_dev_${timestamp}_${randomPart}`;
  }

  /**
   * Génère un secret de paiement avec fallback
   */
  generatePaymentFallbackSecret(paymentId: string): string {
    const secretPart = randomUUID().substring(2, 10);
    return `${paymentId}_secret_${secretPart}`;
  }

  /**
   * Génère un code de récupération/livraison unique
   */
  async generateDeliveryCode(type: "pickup" | "delivery" = "pickup"): Promise<string> {
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      code = this.generateAlphanumericCode(6);
      attempts++;
      
      // Vérifier l'unicité si Prisma est disponible
      if (this.prisma) {
        const field = type === "pickup" ? "pickupCode" : "deliveryCode";
        const existing = await this.prisma.delivery.findFirst({
          where: { [field]: code }
        });
        
        if (!existing) break;
      } else {
        break;
      }
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new Error(`Impossible de générer un code ${type} unique après plusieurs tentatives`);
    }

    return code;
  }

  /**
   * Génère un token de notification sécurisé
   */
  generateNotificationToken(): string {
    return randomBytes(32).toString("hex");
  }

  /**
   * Génère un identifiant d'export temporaire
   */
  generateExportId(): string {
    return randomUUID().substring(7);
  }

  /**
   * Génère une signature de contrat unique
   */
  generateContractSignature(userRole: string): string {
    const timestamp = Date.now();
    const randomPart = randomUUID().substring(2, 11);
    return `${userRole.toLowerCase()}_signature_${timestamp}_${randomPart}`;
  }

  /**
   * Génère un identifiant de fichier uploadé
   */
  generateFileId(): string {
    return randomUUID().substring(2, 11);
  }

  /**
   * Génère un token de toast unique
   */
  generateToastId(): string {
    return randomUUID().substring(2, 11);
  }

  /**
   * Génère un code de validation de livraison
   */
  generateDeliveryValidationCode(): string {
    const timestamp = Date.now().toString();
    const randomPart = randomUUID().substring(2, 11);
    return `${timestamp}${randomPart}`;
  }

  /**
   * Génère un identifiant de service avec couleur
   */
  generateServiceIdWithColor(): { id: string; color: string } {
    const id = randomUUID().substring(2, 11);
    
    // Génère une couleur hex de manière déterministe basée sur l'ID
    const hash = this.simpleHash(id);
    const color = `#${(hash & 0xFFFFFF).toString(16).padStart(6, '0')}`;
    
    return { id, color };
  }

  /**
   * Génère un identifiant d'annonce avec code aléatoire
   */
  generateAnnouncementCode(): string {
    return this.generateAlphanumericCode(4);
  }

  /**
   * Fonction de hachage simple pour la génération de couleurs
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Valide qu'un code généré respecte les contraintes
   */
  validateCode(code: string, expectedLength?: number, pattern?: RegExp): boolean {
    if (expectedLength && code.length !== expectedLength) {
      return false;
    }
    
    if (pattern && !pattern.test(code)) {
      return false;
    }
    
    return true;
  }

  /**
   * Génère un code de vérification temporaire (OTP style)
   */
  generateTemporaryVerificationCode(): string {
    const buffer = randomBytes(3);
    const num = buffer.readUInt32BE(0) & 0xFFFFFF;
    
    // Code de 6 chiffres
    return (num % 1000000).toString().padStart(6, '0');
  }
} 