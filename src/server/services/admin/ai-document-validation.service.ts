/**
 * Service de validation automatique de documents avec IA
 * Remplace la validation manuelle par un système intelligent
 */

import { PrismaClient, DocumentType, VerificationStatus } from "@prisma/client";
import { logger } from "@/lib/utils/logger";
import { prisma } from "@/server/db";
import { notificationService } from "@/server/services/common/notification.service";

// Types pour l'analyse de documents
export interface DocumentAnalysisResult {
  isValid: boolean;
  confidence: number; // 0-100
  documentType: DocumentType;
  extractedData: {
    name?: string;
    birthDate?: Date;
    documentNumber?: string;
    issueDate?: Date;
    expiryDate?: Date;
    issuingAuthority?: string;
    address?: string;
    nationalId?: string;
  };
  issues: DocumentIssue[];
  verificationChecks: {
    formatValid: boolean;
    textReadable: boolean;
    notExpired: boolean;
    signatureDetected?: boolean;
    watermarkDetected?: boolean;
    tamperingDetected: boolean;
  };
}

export interface DocumentIssue {
  type: "ERROR" | "WARNING" | "INFO";
  code: string;
  message: string;
  field?: string;
  suggestion?: string;
}

export interface AIValidationConfig {
  enabled: boolean;
  confidenceThreshold: number;
  autoApproveThreshold: number;
  autoRejectThreshold: number;
  requiredChecks: string[];
  enableOCR: boolean;
  enableTamperDetection: boolean;
}

export class AIDocumentValidationService {
  private readonly defaultConfig: AIValidationConfig = {
    enabled: true,
    confidenceThreshold: 70,
    autoApproveThreshold: 85,
    autoRejectThreshold: 30,
    requiredChecks: ["formatValid", "textReadable", "notExpired"],
    enableOCR: true,
    enableTamperDetection: true,
  };

  constructor(
    private prisma: PrismaClient = prisma,
    private config: AIValidationConfig = this.defaultConfig,
  ) {}

  /**
   * Analyse et valide un document automatiquement
   */
  async validateDocument(
    documentId: string,
    imageBuffer: Buffer,
    documentType: DocumentType,
  ): Promise<DocumentAnalysisResult> {
    try {
      logger.info(`Début validation IA document: ${documentId}`);

      // Analyses en parallèle
      const [
        ocrResult,
        formatAnalysis,
        tamperAnalysis,
        expiryCheck,
        documentClassification,
      ] = await Promise.all([
        this.performOCRAnalysis(imageBuffer),
        this.analyzeDocumentFormat(imageBuffer, documentType),
        this.detectTampering(imageBuffer),
        this.checkDocumentExpiry(imageBuffer, documentType),
        this.classifyDocument(imageBuffer),
      ]);

      // Combiner les résultats d'analyse
      const analysisResult = this.combineAnalysisResults({
        documentId,
        documentType,
        ocrResult,
        formatAnalysis,
        tamperAnalysis,
        expiryCheck,
        documentClassification,
      });

      // Enregistrer le résultat d'analyse
      await this.saveAnalysisResult(documentId, analysisResult);

      // Prendre une décision automatique si possible
      await this.processAutomaticDecision(documentId, analysisResult);

      logger.info(`Validation IA terminée pour document: ${documentId}, confiance: ${analysisResult.confidence}%`);

      return analysisResult;
    } catch (error) {
      logger.error("Erreur validation IA document:", error);
      throw error;
    }
  }

  /**
   * Effectue l'OCR (reconnaissance de texte) sur le document
   */
  private async performOCRAnalysis(imageBuffer: Buffer): Promise<{
    text: string;
    confidence: number;
    words: Array<{ text: string; confidence: number; bbox: number[] }>;
    extractedFields: Record<string, string>;
  }> {
    try {
      // Simulation d'OCR - En production, utiliser Tesseract.js ou Google Vision API
      if (process.env.GOOGLE_VISION_API_KEY) {
        return await this.googleVisionOCR(imageBuffer);
      } else {
        return await this.tesseractOCR(imageBuffer);
      }
    } catch (error) {
      logger.error("Erreur OCR:", error);
      return {
        text: "",
        confidence: 0,
        words: [],
        extractedFields: {},
      };
    }
  }

  /**
   * OCR avec Google Vision API
   */
  private async googleVisionOCR(imageBuffer: Buffer): Promise<any> {
    try {
      const vision = await import('@google-cloud/vision');
      const client = new vision.ImageAnnotatorClient({
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      });

      const [result] = await client.textDetection({
        image: { content: imageBuffer },
      });

      const detections = result.textAnnotations || [];
      const fullText = detections[0]?.description || "";
      
      // Extraire les champs structurés
      const extractedFields = this.extractFieldsFromText(fullText);

      return {
        text: fullText,
        confidence: 90, // Google Vision a généralement une bonne confiance
        words: detections.slice(1).map(detection => ({
          text: detection.description || "",
          confidence: 90,
          bbox: detection.boundingPoly?.vertices?.flat() || [],
        })),
        extractedFields,
      };
    } catch (error) {
      logger.error("Erreur Google Vision OCR:", error);
      throw error;
    }
  }

  /**
   * OCR avec Tesseract.js (fallback)
   */
  private async tesseractOCR(imageBuffer: Buffer): Promise<any> {
    try {
      const Tesseract = await import('tesseract.js');
      
      const { data } = await Tesseract.recognize(imageBuffer, 'fra+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            logger.info(`OCR Tesseract: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      const extractedFields = this.extractFieldsFromText(data.text);

      return {
        text: data.text,
        confidence: data.confidence,
        words: data.words.map(word => ({
          text: word.text,
          confidence: word.confidence,
          bbox: [word.bbox.x0, word.bbox.y0, word.bbox.x1, word.bbox.y1],
        })),
        extractedFields,
      };
    } catch (error) {
      logger.error("Erreur Tesseract OCR:", error);
      throw error;
    }
  }

  /**
   * Extrait les champs structurés du texte OCR
   */
  private extractFieldsFromText(text: string): Record<string, string> {
    const fields: Record<string, string> = {};
    
    // Patterns de reconnaissance pour documents français
    const patterns = {
      name: /(?:nom|name)[\s:]*([a-zA-ZÀ-ÿ\s-]+)/i,
      surname: /(?:prénom|prenom|firstname)[\s:]*([a-zA-ZÀ-ÿ\s-]+)/i,
      birthDate: /(?:né|nee|born)[\s:]*(?:le\s*)?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      documentNumber: /(?:n°|numero|number)[\s:]*([A-Z0-9]+)/i,
      nationalId: /(\d{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{3}\s?\d{2})/,
      issueDate: /(?:délivré|delivered|issued)[\s:]*(?:le\s*)?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      expiryDate: /(?:expire|valid|valable)[\s:]*(?:jusqu|until|au\s*)?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    };

    for (const [fieldName, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern);
      if (match && match[1]) {
        fields[fieldName] = match[1].trim();
      }
    }

    return fields;
  }

  /**
   * Analyse le format et la qualité du document
   */
  private async analyzeDocumentFormat(
    imageBuffer: Buffer,
    expectedType: DocumentType,
  ): Promise<{
    formatValid: boolean;
    quality: number;
    resolution: { width: number; height: number };
    colorSpace: string;
    issues: DocumentIssue[];
  }> {
    try {
      const sharp = await import('sharp');
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();

      const issues: DocumentIssue[] = [];
      let formatValid = true;
      let quality = 100;

      // Vérifier la résolution minimale
      if (metadata.width && metadata.width < 800) {
        issues.push({
          type: "WARNING",
          code: "LOW_RESOLUTION",
          message: "Résolution trop faible, veuillez utiliser une image de meilleure qualité",
          suggestion: "Prenez la photo avec une résolution d'au moins 1200x800 pixels",
        });
        quality -= 20;
      }

      // Vérifier le format d'image
      if (!["jpeg", "jpg", "png", "webp"].includes(metadata.format || "")) {
        issues.push({
          type: "ERROR",
          code: "INVALID_FORMAT",
          message: "Format d'image non supporté",
          suggestion: "Utilisez un format JPEG, PNG ou WebP",
        });
        formatValid = false;
        quality -= 30;
      }

      // Détecter le flou
      const stats = await image.stats();
      const sharpness = this.calculateSharpness(stats);
      if (sharpness < 50) {
        issues.push({
          type: "WARNING",
          code: "BLURRY_IMAGE",
          message: "Image floue détectée",
          suggestion: "Prenez une photo plus nette du document",
        });
        quality -= 15;
      }

      return {
        formatValid,
        quality: Math.max(0, quality),
        resolution: {
          width: metadata.width || 0,
          height: metadata.height || 0,
        },
        colorSpace: metadata.space || "unknown",
        issues,
      };
    } catch (error) {
      logger.error("Erreur analyse format document:", error);
      return {
        formatValid: false,
        quality: 0,
        resolution: { width: 0, height: 0 },
        colorSpace: "unknown",
        issues: [{
          type: "ERROR",
          code: "FORMAT_ANALYSIS_FAILED",
          message: "Impossible d'analyser le format du document",
        }],
      };
    }
  }

  /**
   * Détecte les tentatives de falsification
   */
  private async detectTampering(imageBuffer: Buffer): Promise<{
    tamperingDetected: boolean;
    confidence: number;
    anomalies: Array<{
      type: string;
      location?: { x: number; y: number; width: number; height: number };
      description: string;
    }>;
  }> {
    try {
      // Analyse simplifiée - En production, utiliser des algorithmes plus sophistiqués
      const sharp = await import('sharp');
      const image = sharp(imageBuffer);
      
      // Analyser la compression JPEG pour détecter les modifications
      const metadata = await image.metadata();
      const anomalies: any[] = [];
      
      // Vérifier la cohérence des métadonnées EXIF
      if (metadata.exif) {
        const exifInconsistencies = this.analyzeExifData(metadata.exif);
        anomalies.push(...exifInconsistencies);
      }

      // Analyser les artefacts de compression
      const compressionArtifacts = await this.analyzeCompressionArtifacts(image);
      anomalies.push(...compressionArtifacts);

      const tamperingDetected = anomalies.filter(a => a.type === "SUSPICIOUS").length > 0;
      const confidence = tamperingDetected ? 80 : 20;

      return {
        tamperingDetected,
        confidence,
        anomalies,
      };
    } catch (error) {
      logger.error("Erreur détection falsification:", error);
      return {
        tamperingDetected: false,
        confidence: 0,
        anomalies: [],
      };
    }
  }

  /**
   * Vérifie l'expiration du document
   */
  private async checkDocumentExpiry(
    imageBuffer: Buffer,
    documentType: DocumentType,
  ): Promise<{
    isExpired: boolean;
    expiryDate?: Date;
    daysUntilExpiry?: number;
    issues: DocumentIssue[];
  }> {
    try {
      // Cette méthode nécessiterait l'extraction de la date d'expiration via OCR
      // Pour l'instant, retourner une analyse basique
      const issues: DocumentIssue[] = [];

      // Simuler l'extraction de date d'expiration
      // En production, utiliser le résultat OCR pour extraire les dates
      
      return {
        isExpired: false,
        issues,
      };
    } catch (error) {
      logger.error("Erreur vérification expiration:", error);
      return {
        isExpired: false,
        issues: [{
          type: "WARNING",
          code: "EXPIRY_CHECK_FAILED",
          message: "Impossible de vérifier la date d'expiration",
        }],
      };
    }
  }

  /**
   * Classifie automatiquement le type de document
   */
  private async classifyDocument(imageBuffer: Buffer): Promise<{
    predictedType: DocumentType;
    confidence: number;
    alternatives: Array<{ type: DocumentType; confidence: number }>;
  }> {
    try {
      // Classification basique basée sur la taille et les patterns
      // En production, utiliser un modèle ML entraîné
      
      return {
        predictedType: "IDENTITY_CARD",
        confidence: 75,
        alternatives: [
          { type: "PASSPORT", confidence: 60 },
          { type: "DRIVING_LICENSE", confidence: 45 },
        ],
      };
    } catch (error) {
      logger.error("Erreur classification document:", error);
      return {
        predictedType: "IDENTITY_CARD",
        confidence: 0,
        alternatives: [],
      };
    }
  }

  /**
   * Combine tous les résultats d'analyse
   */
  private combineAnalysisResults(results: {
    documentId: string;
    documentType: DocumentType;
    ocrResult: any;
    formatAnalysis: any;
    tamperAnalysis: any;
    expiryCheck: any;
    documentClassification: any;
  }): DocumentAnalysisResult {
    const issues: DocumentIssue[] = [
      ...results.formatAnalysis.issues,
      ...results.expiryCheck.issues,
    ];

    // Ajout d'alertes de falsification
    if (results.tamperAnalysis.tamperingDetected) {
      issues.push({
        type: "ERROR",
        code: "TAMPERING_DETECTED",
        message: "Possible falsification détectée",
        suggestion: "Veuillez fournir un document original",
      });
    }

    // Vérification de cohérence du type de document
    if (results.documentClassification.predictedType !== results.documentType) {
      issues.push({
        type: "WARNING",
        code: "DOCUMENT_TYPE_MISMATCH",
        message: `Type de document prévu: ${results.documentType}, détecté: ${results.documentClassification.predictedType}`,
      });
    }

    // Calcul de la confiance globale
    const baseConfidence = (results.ocrResult.confidence + results.formatAnalysis.quality) / 2;
    const penalties = issues.filter(i => i.type === "ERROR").length * 20 + 
                     issues.filter(i => i.type === "WARNING").length * 10;
    const confidence = Math.max(0, Math.min(100, baseConfidence - penalties));

    // Déterminer la validité
    const criticalIssues = issues.filter(i => i.type === "ERROR").length;
    const isValid = criticalIssues === 0 && confidence >= this.config.confidenceThreshold;

    return {
      isValid,
      confidence,
      documentType: results.documentType,
      extractedData: {
        name: results.ocrResult.extractedFields.name,
        documentNumber: results.ocrResult.extractedFields.documentNumber,
        // ... autres champs extraits
      },
      issues,
      verificationChecks: {
        formatValid: results.formatAnalysis.formatValid,
        textReadable: results.ocrResult.confidence > 50,
        notExpired: !results.expiryCheck.isExpired,
        tamperingDetected: results.tamperAnalysis.tamperingDetected,
      },
    };
  }

  /**
   * Sauvegarde le résultat d'analyse
   */
  private async saveAnalysisResult(
    documentId: string,
    result: DocumentAnalysisResult,
  ): Promise<void> {
    try {
      await this.prisma.documentAnalysis.create({
        data: {
          documentId,
          confidence: result.confidence,
          isValid: result.isValid,
          extractedData: result.extractedData,
          verificationChecks: result.verificationChecks,
          issues: result.issues,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      logger.error("Erreur sauvegarde analyse:", error);
    }
  }

  /**
   * Traite la décision automatique
   */
  private async processAutomaticDecision(
    documentId: string,
    analysis: DocumentAnalysisResult,
  ): Promise<void> {
    try {
      let newStatus: VerificationStatus | null = null;
      let autoDecision = false;

      if (analysis.confidence >= this.config.autoApproveThreshold && analysis.isValid) {
        newStatus = "APPROVED";
        autoDecision = true;
        logger.info(`Document ${documentId} approuvé automatiquement (confiance: ${analysis.confidence}%)`);
      } else if (analysis.confidence <= this.config.autoRejectThreshold || !analysis.isValid) {
        newStatus = "REJECTED";
        autoDecision = true;
        logger.info(`Document ${documentId} rejeté automatiquement (confiance: ${analysis.confidence}%)`);
      }

      if (newStatus) {
        // Mettre à jour le statut du document
        await this.prisma.document.update({
          where: { id: documentId },
          data: {
            verificationStatus: newStatus,
            verifiedAt: autoDecision ? new Date() : undefined,
            verifiedBy: autoDecision ? "SYSTEM_AI" : undefined,
            metadata: {
              aiAnalysis: analysis,
              autoDecision,
            },
          },
        });

        // Récupérer l'utilisateur pour notification
        const document = await this.prisma.document.findUnique({
          where: { id: documentId },
          select: { userId: true, type: true },
        });

        if (document?.userId) {
          // Notifier l'utilisateur
          await notificationService.sendUserNotification({
            userId: document.userId,
            title: newStatus === "APPROVED" ? "Document approuvé" : "Document rejeté",
            message: newStatus === "APPROVED" 
              ? "Votre document a été vérifié et approuvé automatiquement"
              : `Votre document a été rejeté. Raisons: ${analysis.issues.map(i => i.message).join(", ")}`,
            type: newStatus === "APPROVED" ? "DOCUMENT_APPROVED" : "DOCUMENT_REJECTED",
            actionUrl: `/profile/documents`,
          });
        }
      }
    } catch (error) {
      logger.error("Erreur traitement décision automatique:", error);
    }
  }

  /**
   * Méthodes utilitaires
   */
  private calculateSharpness(stats: any): number {
    // Calcul simplifié de la netteté basé sur les statistiques d'image
    // En production, utiliser des algorithmes plus sophistiqués comme Sobel ou Laplacian
    return Math.random() * 100; // Placeholder
  }

  private analyzeExifData(exifBuffer: Buffer): any[] {
    // Analyser les métadonnées EXIF pour détecter les incohérences
    return [];
  }

  private async analyzeCompressionArtifacts(image: any): Promise<any[]> {
    // Analyser les artefacts de compression pour détecter les modifications
    return [];
  }

  /**
   * API publique pour obtenir le statut de validation
   */
  async getValidationStatus(documentId: string): Promise<{
    status: VerificationStatus;
    confidence?: number;
    lastAnalysis?: DocumentAnalysisResult;
    canRetry: boolean;
  } | null> {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          analyses: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });

      if (!document) return null;

      const lastAnalysis = document.analyses[0];

      return {
        status: document.verificationStatus,
        confidence: lastAnalysis?.confidence,
        lastAnalysis: lastAnalysis ? {
          isValid: lastAnalysis.isValid,
          confidence: lastAnalysis.confidence,
          documentType: document.type,
          extractedData: lastAnalysis.extractedData as any,
          issues: lastAnalysis.issues as DocumentIssue[],
          verificationChecks: lastAnalysis.verificationChecks as any,
        } : undefined,
        canRetry: document.verificationStatus === "REJECTED",
      };
    } catch (error) {
      logger.error("Erreur récupération statut validation:", error);
      return null;
    }
  }
}

// Export du service instancié
export const aiDocumentValidationService = new AIDocumentValidationService();