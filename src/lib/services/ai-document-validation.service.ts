import { createReadStream } from "fs";
import { join } from "path";

export interface DocumentValidationResult {
  isValid: boolean;
  confidence: number;
  documentType: DocumentType;
  extractedData: Record<string, any>;
  issues: ValidationIssue[];
  suggestions: string[];
}

export interface ValidationIssue {
  type: "ERROR" | "WARNING" | "INFO";
  code: string;
  message: string;
  field?: string;
}

export type DocumentType = 
  | "DRIVING_LICENSE"
  | "ID_CARD" 
  | "PASSPORT"
  | "INSURANCE_CARD"
  | "VEHICLE_REGISTRATION"
  | "SIRET_DOCUMENT"
  | "BANK_RIB"
  | "CERTIFICATE"
  | "UNKNOWN";

export interface DocumentValidationConfig {
  enableAI: boolean;
  apiProvider: "OPENAI" | "ANTHROPIC" | "GOOGLE_VISION" | "AWS_TEXTRACT";
  strictMode: boolean;
  minConfidence: number;
  allowedFormats: string[];
  maxFileSize: number;
}

export class AIDocumentValidationService {
  private config: DocumentValidationConfig;
  
  constructor(config?: Partial<DocumentValidationConfig>) {
    this.config = {
      enableAI: process.env.ENABLE_AI_VALIDATION === "true",
      apiProvider: (process.env.AIPROVIDER as any) || "OPENAI",
      strictMode: process.env.STRICT_VALIDATION === "true",
      minConfidence: parseFloat(process.env.MIN_VALIDATIONCONFIDENCE || "0.8"),
      allowedFormats: ["pdf", "jpg", "jpeg", "png", "webp"],
      maxFileSize: 10 * 1024 * 1024, // 10MB
      ...config
    };
  }

  /**
   * Valide un document uploadé
   */
  async validateDocument(
    filePath: string,
    expectedType: DocumentType,
    userId: string,
    metadata?: Record<string, any>
  ): Promise<DocumentValidationResult> {
    try {
      // Vérifications préliminaires
      const preliminaryChecks = await this.performPreliminaryChecks(filePath);
      if (!preliminaryChecks.isValid) {
        return preliminaryChecks;
      }

      // Extraction et analyse du contenu
      let result: DocumentValidationResult;
      
      if (this.config.enableAI) {
        result = await this.performAIValidation(filePath, expectedType, metadata);
      } else {
        result = await this.performBasicValidation(filePath, expectedType);
      }

      // Post-traitement et validation métier
      result = await this.postProcessValidation(result, expectedType, userId);

      return result;
    } catch (error) {
      console.error("Erreur lors de la validation du document:", error);
      return {
        isValid: false,
        confidence: 0,
        documentType: "UNKNOWN",
        extractedData: {},
        issues: [{
          type: "ERROR",
          code: "VALIDATION_FAILED",
          message: "Erreur lors de la validation du document"
        }],
        suggestions: ["Veuillez réessayer ou contacter le support"]
      };
    }
  }

  /**
   * Vérifications préliminaires (format, taille, etc.)
   */
  private async performPreliminaryChecks(filePath: string): Promise<DocumentValidationResult> {
    const issues: ValidationIssue[] = [];
    
    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      
      // Vérifier que le fichier existe
      const stats = await fs.stat(filePath);
      
      // Vérifier la taille
      if (stats.size > this.config.maxFileSize) {
        issues.push({
          type: "ERROR",
          code: "FILE_TOO_LARGE",
          message: `Le fichier est trop volumineux (${Math.round(stats.size / 1024 / 1024)}MB max: ${Math.round(this.config.maxFileSize / 1024 / 1024)}MB)`
        });
      }
      
      // Vérifier l'extension
      const extension = path.extname(filePath).toLowerCase().slice(1);
      if (!this.config.allowedFormats.includes(extension)) {
        issues.push({
          type: "ERROR",
          code: "INVALID_FORMAT",
          message: `Format non supporté. Formats acceptés: ${this.config.allowedFormats.join(", ")}`
        });
      }

      // Vérifier si c'est bien une image ou un PDF
      const buffer = await fs.readFile(filePath);
      const isValidFile = await this.validateFileSignature(buffer, extension);
      
      if (!isValidFile) {
        issues.push({ type: "ERROR",
          code: "CORRUPTED_FILE",
          message: "Le fichier semble corrompu ou n'est pas du bon type"
         });
      }

      return {
        isValid: issues.filter(i => i.type === "ERROR").length === 0,
        confidence: issues.length === 0 ? 1.0 : 0.5,
        documentType: "UNKNOWN",
        extractedData: { fileSize: stats.size, extension },
        issues,
        suggestions: issues.length > 0 ? ["Veuillez uploader un fichier valide"] : []
      };
    } catch (error) {
      return {
        isValid: false,
        confidence: 0,
        documentType: "UNKNOWN",
        extractedData: {},
        issues: [{
          type: "ERROR",
          code: "FILE_ACCESS_ERROR",
          message: "Impossible d'accéder au fichier"
        }],
        suggestions: ["Veuillez réessayer l'upload"]
      };
    }
  }

  /**
   * Validation avec IA
   */
  private async performAIValidation(
    filePath: string,
    expectedType: DocumentType,
    metadata?: Record<string, any>
  ): Promise<DocumentValidationResult> {
    try {
      switch (this.config.apiProvider) {
        case "OPENAI":
          return await this.validateWithOpenAI(filePath, expectedType, metadata);
        case "GOOGLE_VISION":
          return await this.validateWithGoogleVision(filePath, expectedType);
        case "AWS_TEXTRACT":
          return await this.validateWithAWSTextract(filePath, expectedType);
        default:
          return await this.performBasicValidation(filePath, expectedType);
      }
    } catch (error) {
      console.error("Erreur lors de la validation IA:", error);
      // Fallback vers validation basique
      return await this.performBasicValidation(filePath, expectedType);
    }
  }

  /**
   * Validation avec OpenAI Vision
   */
  private async validateWithOpenAI(
    filePath: string,
    expectedType: DocumentType,
    metadata?: Record<string, any>
  ): Promise<DocumentValidationResult> {
    try {
      const fs = await import("fs/promises");
      const fileBuffer = await fs.readFile(filePath);
      const base64Image = fileBuffer.toString("base64");
      
      const prompt = this.buildOpenAIPrompt(expectedType, metadata);
      
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"},
        body: JSON.stringify({
          model: "gpt-4-vision-preview",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt
                },
                {
                  type: "image_url",
                  imageurl: {
                    url: `data:image/jpeg;base64,${base64Image}`
                  }
                }
              ]
            }
          ], max_tokens: 1000
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const analysis = data.choices[0]?.message?.content;
      
      if (!analysis) {
        throw new Error("Pas de réponse de l'IA");
      }

      return this.parseAIResponse(analysis, expectedType);
    } catch (error) {
      console.error("Erreur OpenAI:", error);
      return await this.performBasicValidation(filePath, expectedType);
    }
  }

  /**
   * Validation avec Google Vision API
   */
  private async validateWithGoogleVision(
    filePath: string,
    expectedType: DocumentType
  ): Promise<DocumentValidationResult> {
    try {
      const fs = await import("fs/promises");
      const fileBuffer = await fs.readFile(filePath);
      const base64Image = fileBuffer.toString("base64");

      const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"},
        body: JSON.stringify({
          requests: [
            {
              image: { content },
              features: [
                { type: "TEXT_DETECTION" },
                { type: "DOCUMENT_TEXT_DETECTION" },
                { type: "OBJECT_LOCALIZATION" }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Google Vision API error: ${response.statusText}`);
      }

      const data = await response.json();
      const textAnnotations = data.responses[0]?.textAnnotations;
      
      if (!textAnnotations || textAnnotations.length === 0) {
        return {
          isValid: false,
          confidence: 0.3,
          documentType: "UNKNOWN",
          extractedData: {},
          issues: [{
            type: "WARNING",
            code: "NO_TEXT_DETECTED",
            message: "Aucun texte détecté dans le document"
          }],
          suggestions: ["Assurez-vous que le document est lisible et bien éclairé"]
        };
      }

      const extractedText = textAnnotations[0].description;
      return this.analyzeExtractedText(extractedText, expectedType);
    } catch (error) {
      console.error("Erreur Google Vision:", error);
      return await this.performBasicValidation(filePath, expectedType);
    }
  }

  /**
   * Validation basique sans IA
   */
  private async performBasicValidation(
    filePath: string,
    expectedType: DocumentType
  ): Promise<DocumentValidationResult> {
    const issues: ValidationIssue[] = [];
    const suggestions: string[] = [];

    // Validation basique basée sur le nom de fichier et la taille
    const path = await import("path");
    const filename = path.basename(filePath).toLowerCase();
    
    // Heuristiques simples basées sur le nom de fichier
    const typeIndicators = { DRIVING_LICENSE: ["permis", "license", "driving", "conduire"], ID_CARD: ["carte", "identite", "id", "cni"],
      PASSPORT: ["passeport", "passport"], INSURANCE_CARD: ["assurance", "insurance"], VEHICLE_REGISTRATION: ["carte", "grise", "registration", "vehicule"], SIRET_DOCUMENT: ["siret", "kbis", "entreprise"], BANK_RIB: ["rib", "bank", "iban"],
      CERTIFICATE: ["certificat", "certificate", "diplome"]
    };

    let detectedType: DocumentType = "UNKNOWN";
    const confidence = 0.5;

    for (const [type, indicators] of Object.entries(typeIndicators)) {
      if (indicators.some(indicator => filename.includes(indicator))) {
        detectedType = type as DocumentType;
        confidence = type === expectedType ? 0.8 : 0.6;
        break;
      }
    }

    if (detectedType !== expectedType && expectedType !== "UNKNOWN") {
      issues.push({
        type: "WARNING",
        code: "TYPE_MISMATCH",
        message: `Le document semble être de type ${detectedType} mais ${expectedType} était attendu`
      });
      suggestions.push("Vérifiez que vous avez uploadé le bon type de document");
    }

    return {
      isValid: issues.filter(i => i.type === "ERROR").length === 0,
      confidence,
      documentType: detectedType,
      extractedData: { filename, detectedFromFilename: true },
      issues,
      suggestions
    };
  }

  /**
   * Post-traitement et validation métier
   */
  private async postProcessValidation(
    result: DocumentValidationResult,
    expectedType: DocumentType,
    userId: string
  ): Promise<DocumentValidationResult> {
    const db = await import("@/server/db").then(m => m.db);
    
    // Vérifications métier spécifiques
    if (result.isValid && result.confidence >= this.config.minConfidence) {
      switch (expectedType) {
        case "DRIVING_LICENSE":
          result = await this.validateDrivingLicense(result, userId);
          break;
        case "SIRET_DOCUMENT":
          result = await this.validateSiretDocument(result, userId);
          break;
        case "BANK_RIB":
          result = await this.validateBankRIB(result, userId);
          break;
      }
    }

    // Vérifier si l'utilisateur a déjà ce type de document validé
    try {
      const existingDoc = await db.document.findFirst({
        where: {
          userId,
          type: expectedType,
          status: "APPROVED"
        }
      });

      if (existingDoc) {
        result.issues.push({ type: "INFO",
          code: "EXISTING_DOCUMENT",
          message: "Vous avez déjà un document de ce type validé"
         });
        result.suggestions.push("Ce document remplacera le précédent après validation");
      }
    } catch (error) {
      console.error("Erreur lors de la vérification des documents existants:", error);
    }

    return result;
  }

  /**
   * Validation spécifique pour permis de conduire
   */
  private async validateDrivingLicense(
    result: DocumentValidationResult,
    userId: string
  ): Promise<DocumentValidationResult> {
    const extractedData = result.extractedData;
    
    // Vérifier les champs obligatoires
    const requiredFields = ["number", "expiryDate", "categories"];
    const missingFields = requiredFields.filter(field => !extractedData[field]);
    
    if (missingFields.length > 0) {
      result.issues.push({
        type: "WARNING",
        code: "MISSING_FIELDS",
        message: `Champs manquants: ${missingFields.join(", ")}`
      });
      result.confidence *= 0.8;
    }

    // Vérifier la date d'expiration
    if (extractedData.expiryDate) {
      const expiryDate = new Date(extractedData.expiryDate);
      if (expiryDate < new Date()) {
        result.issues.push({ type: "ERROR",
          code: "EXPIRED_DOCUMENT",
          message: "Le permis de conduire a expiré"
         });
        result.isValid = false;
      } else if (expiryDate < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)) {
        result.issues.push({ type: "WARNING",
          code: "EXPIRING_SOON",
          message: "Le permis de conduire expire dans moins de 3 mois"
         });
      }
    }

    return result;
  }

  /**
   * Validation spécifique pour document SIRET
   */
  private async validateSiretDocument(
    result: DocumentValidationResult,
    userId: string
  ): Promise<DocumentValidationResult> {
    const extractedData = result.extractedData;
    
    if (extractedData.siretNumber) {
      // Validation basique du format SIRET (14 chiffres)
      const siret = extractedData.siretNumber.replace(/\s/g, "");
      if (!/^\d{14}$/.test(siret)) {
        result.issues.push({ type: "ERROR",
          code: "INVALID_SIRET_FORMAT",
          message: "Le numéro SIRET doit contenir 14 chiffres"
         });
        result.isValid = false;
      } else {
        // Validation de la clé de contrôle SIRET
        if (!this.validateSiretChecksum(siret)) {
          result.issues.push({ type: "ERROR",
            code: "INVALID_SIRET_CHECKSUM",
            message: "Le numéro SIRET n'est pas valide"
           });
          result.isValid = false;
        }
      }
    }

    return result;
  }

  /**
   * Validation spécifique pour RIB
   */
  private async validateBankRIB(
    result: DocumentValidationResult,
    userId: string
  ): Promise<DocumentValidationResult> {
    const extractedData = result.extractedData;
    
    if (extractedData.iban) {
      // Validation basique de l'IBAN
      const iban = extractedData.iban.replace(/\s/g, "");
      if (!this.validateIBAN(iban)) {
        result.issues.push({ type: "ERROR",
          code: "INVALID_IBAN",
          message: "L'IBAN n'est pas valide"
         });
        result.isValid = false;
      }
    }

    return result;
  }

  /**
   * Construit le prompt pour OpenAI
   */
  private buildOpenAIPrompt(expectedType: DocumentType, metadata?: Record<string, any>): string {
    const basePrompt = `Analysez cette image de document et extrayez les informations suivantes au format JSON:

{
  "documentType": "type détecté",
  "isValid": true/false,
  "confidence": 0.0-1.0,
  "extractedData": {
    // données extraites selon le type de document
  },
  "issues": [
    {
      "type": "ERROR|WARNING|INFO",
      "code": "CODE_ERREUR",
      "message": "Description du problème"
    }
  ]
}

Type de document attendu: ${expectedType}

`;

    const typeSpecificInstructions = { DRIVING_LICENSE: `
Pour un permis de conduire, extrayez:
- number: numéro du permis
- firstName: prénom
- lastName: nom
- birthDate: date de naissance
- issueDate: date de délivrance
- expiryDate: date d'expiration
- categories: catégories autorisées (A, B, C, etc.)
- issuingCountry: pays de délivrance

Vérifiez que le document n'est pas expiré et que les informations sont lisibles.`, ID_CARD: `
Pour une carte d'identité, extrayez:
- number: numéro de la carte
- firstName: prénom
- lastName: nom
- birthDate: date de naissance
- birthPlace: lieu de naissance
- issueDate: date de délivrance
- expiryDate: date d'expiration
- nationality: nationalité

Vérifiez l'authenticité visuelle et la cohérence des dates.`, SIRET_DOCUMENT: `
Pour un document SIRET/Kbis, extrayez:
- siretNumber: numéro SIRET
- companyName: raison sociale
- address: adresse du siège
- activityCode: code APE/NAF
- registrationDate: date d'immatriculation
- status: statut (actif/cessé)

Vérifiez que l'entreprise est active et que le document est récent.`, BANK_RIB: `
Pour un RIB, extrayez:
- bankName: nom de la banque
- accountHolder: titulaire du compte
- iban: IBAN complet
- bic: code BIC/SWIFT
- bankCode: code banque
- branchCode: code guichet
- accountNumber: numéro de compte
- key: clé RIB

Vérifiez la validité de l'IBAN et la cohérence des informations.`
    };

    return basePrompt + (typeSpecificInstructions[expectedType] || "");
  }

  /**
   * Parse la réponse de l'IA
   */
  private parseAIResponse(response: string, expectedType: DocumentType): DocumentValidationResult {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Pas de JSON trouvé dans la réponse");
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        isValid: parsed.isValid || false,
        confidence: Math.min(Math.max(parsed.confidence || 0, 0), 1),
        documentType: parsed.documentType || expectedType,
        extractedData: parsed.extractedData || {},
        issues: parsed.issues || [],
        suggestions: this.generateSuggestions(parsed.issues || [], expectedType)
      };
    } catch (error) {
      console.error("Erreur lors du parsing de la réponse IA:", error);
      return {
        isValid: false,
        confidence: 0.3,
        documentType: expectedType,
        extractedData: {},
        issues: [{
          type: "ERROR",
          code: "AI_PARSING_ERROR",
          message: "Erreur lors de l'analyse du document"
        }],
        suggestions: ["Veuillez réessayer avec une image de meilleure qualité"]
      };
    }
  }

  /**
   * Analyse le texte extrait pour validation
   */
  private analyzeExtractedText(text: string, expectedType: DocumentType): DocumentValidationResult {
    const issues: ValidationIssue[] = [];
    const extractedData: Record<string, any> = { fullText };
    
    // Expressions régulières pour différents types de documents
    const patterns = { DRIVING_LICENSE: {
        number: /(?:N°|Numéro|Number)[\s:]*([A-Z0-9]{10,15})/i,
        expiryDate: /(?:Valid|Valable|Expire)[\s:]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i
      }, SIRET_DOCUMENT: {
        siretNumber: /SIRET[\s:]*(\d{3}\s?\d{3}\s?\d{3}\s?\d{5})/i,
        companyName: /Dénomination[\s:]*([^\n\r]+)/i
      }, BANK_RIB: {
        iban: /(FR\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{3})/i,
        bic: /BIC[\s:]*([A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)/i
      }
    };

    const typePatterns = patterns[expectedType];
    if (typePatterns) {
      for (const [field, pattern] of Object.entries(typePatterns)) {
        const match = text.match(pattern);
        if (match) {
          extractedData[field] = match[1].trim();
        }
      }
    }

    // Évaluer la confiance basée sur les correspondances trouvées
    const expectedFields = Object.keys(typePatterns || {});
    const foundFields = expectedFields.filter(field => extractedData[field]);
    const confidence = foundFields.length / Math.max(expectedFields.length, 1);

    return {
      isValid: confidence >= 0.5,
      confidence,
      documentType: expectedType,
      extractedData,
      issues,
      suggestions: this.generateSuggestions(issues, expectedType)
    };
  }

  /**
   * Génère des suggestions basées sur les problèmes détectés
   */
  private generateSuggestions(issues: ValidationIssue[], documentType: DocumentType): string[] {
    const suggestions: string[] = [];
    
    const hasErrors = issues.some(i => i.type === "ERROR");
    const hasWarnings = issues.some(i => i.type === "WARNING");
    
    if (hasErrors) {
      suggestions.push("Vérifiez que le document est valide et non expiré");
      suggestions.push("Assurez-vous que toutes les informations sont visibles");
    }
    
    if (hasWarnings) {
      suggestions.push("Prenez une photo plus nette du document");
      suggestions.push("Vérifiez l'éclairage et évitez les reflets");
    }

    // Suggestions spécifiques par type
    const typeSpecificSuggestions = { DRIVING_LICENSE: ["Assurez-vous que le permis est français et en cours de validité"], ID_CARD: ["Vérifiez que la carte d'identité est française et lisible"], SIRET_DOCUMENT: ["Le document doit être un Kbis de moins de 3 mois"], BANK_RIB: ["Utilisez un RIB original de votre banque"]
    };

    if (typeSpecificSuggestions[documentType]) {
      suggestions.push(...typeSpecificSuggestions[documentType]);
    }

    return [...new Set(suggestions)]; // Supprimer les doublons
  }

  /**
   * Valide la signature d'un fichier
   */
  private async validateFileSignature(buffer: Buffer, extension: string): Promise<boolean> {
    const signatures = {
      pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
      jpg: [0xFF, 0xD8, 0xFF],
      jpeg: [0xFF, 0xD8, 0xFF],
      png: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
      webp: [0x52, 0x49, 0x46, 0x46] // RIFF
    };

    const signature = signatures[extension as keyof typeof signatures];
    if (!signature) return true; // Format non vérifié

    return signature.every((byte, index) => buffer[index] === byte);
  }

  /**
   * Valide la clé de contrôle d'un SIRET
   */
  private validateSiretChecksum(siret: string): boolean {
    if (siret.length !== 14) return false;
    
    const sum = 0;
    for (let i = 0; i < 13; i++) {
      const digit = parseInt(siret[i]);
      if (i % 2 === 1) {
        digit *= 2;
        if (digit > 9) digit = Math.floor(digit / 10) + (digit % 10);
      }
      sum += digit;
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(siret[13]);
  }

  /**
   * Valide un IBAN
   */
  private validateIBAN(iban: string): boolean {
    // Validation basique du format français
    if (!iban.startsWith('FR') || iban.length !== 27) {
      return false;
    }

    // Réorganiser pour la validation modulo 97
    const rearranged = iban.slice(4) + iban.slice(0, 4);
    
    // Remplacer les lettres par des chiffres (A=10, B=11, etc.)
    const numericString = '';
    for (const char of rearranged) {
      if (char >= 'A' && char <= 'Z') {
        numericString += (char.charCodeAt(0) - 'A'.charCodeAt(0) + 10).toString();
      } else {
        numericString += char;
      }
    }

    // Calcul modulo 97
    const remainder = 0;
    for (const digit of numericString) {
      remainder = (remainder * 10 + parseInt(digit)) % 97;
    }

    return remainder === 1;
  }
}

// Export singleton
export const aiDocumentValidationService = new AIDocumentValidationService();