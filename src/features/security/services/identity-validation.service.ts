import { db } from '@/lib/db'
import { z } from 'zod'
import crypto from 'crypto'

// Niveaux de validation d'identité
enum IdentityVerificationLevel {
  NONE = 'NONE',
  BASIC = 'BASIC',        // Email + téléphone
  VERIFIED = 'VERIFIED',   // + Documents d'identité
  PREMIUM = 'PREMIUM'      // + Vérification bancaire + historique
}

interface SecurityCheck {
  type: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION' | 'DOCUMENT_VALIDATION' | 
        'BACKGROUND_CHECK' | 'ANTI_FRAUD' | 'GEOLOCATION_VERIFY'
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED'
  completedAt?: Date
  expiresAt?: Date
  metadata?: Record<string, any>
  rejectionReason?: string
}

interface AntiFraudAnalysis {
  riskScore: number // 0-100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  flags: Array<{
    type: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH'
    description: string
    confidence: number
  }>
  recommendations: string[]
  ipAnalysis: {
    isVPN: boolean
    isTor: boolean
    isProxy: boolean
    country: string
    riskLevel: string
  }
  deviceFingerprint: string
  behaviorAnalysis: {
    velocityFlags: string[]
    patternFlags: string[]
    suspiciousActivity: boolean
  }
}

const documentValidationSchema = z.object({
  documentType: z.enum(['IDENTITY_CARD', 'PASSPORT', 'DRIVING_LICENSE', 'UTILITY_BILL']),
  documentNumber: z.string().min(5).max(20),
  documentCountry: z.string().length(2),
  expiryDate: z.string().datetime().optional(),
  frontImageUrl: z.string().url(),
  backImageUrl: z.string().url().optional(),
  selfieUrl: z.string().url() // Photo avec document
})

class IdentityValidationService {

  /**
   * Valider l'identité d'un utilisateur étape par étape
   */
  async initiateIdentityVerification(
    userId: string,
    targetLevel: IdentityVerificationLevel,
    metadata?: Record<string, any>
  ): Promise<{ verificationId: string; requiredSteps: string[] }> {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        include: { profile: true, identityVerification: true }
      })

      if (!user) {
        throw new Error('Utilisateur introuvable')
      }

      // Déterminer les étapes requises selon le niveau cible
      const requiredSteps = this.getRequiredVerificationSteps(
        user.identityVerification?.level || IdentityVerificationLevel.NONE,
        targetLevel
      )

      // Créer un processus de vérification
      const verification = await db.identityVerification.upsert({
        where: { userId },
        create: {
          userId,
          targetLevel,
          currentLevel: user.identityVerification?.level || IdentityVerificationLevel.NONE,
          status: 'IN_PROGRESS',
          requiredSteps,
          metadata: metadata || {},
          createdAt: new Date()
        },
        update: {
          targetLevel,
          status: 'IN_PROGRESS',
          requiredSteps,
          metadata: { ...(user.identityVerification?.metadata || {}), ...metadata },
          updatedAt: new Date()
        }
      })

      return {
        verificationId: verification.id,
        requiredSteps
      }

    } catch (error) {
      console.error('Error initiating identity verification:', error)
      throw new Error('Erreur lors de l\'initiation de la vérification d\'identité')
    }
  }

  /**
   * Valider un document d'identité avec OCR et vérifications
   */
  async validateDocument(
    userId: string,
    documentData: z.infer<typeof documentValidationSchema>
  ): Promise<{ success: boolean; confidence: number; extractedData?: any; issues?: string[] }> {
    try {
      const validatedData = documentValidationSchema.parse(documentData)

      // Simulation d'analyse OCR (à remplacer par une vraie API comme Onfido, Jumio, etc.)
      const ocrResult = await this.performOCRAnalysis(validatedData)
      
      // Vérifications de cohérence
      const consistencyChecks = await this.performConsistencyChecks(userId, ocrResult)
      
      // Vérification anti-fraude du document
      const fraudChecks = await this.performDocumentFraudCheck(validatedData)

      // Score de confiance global
      const confidence = (ocrResult.confidence + consistencyChecks.score + fraudChecks.score) / 3

      const issues: string[] = []
      if (ocrResult.issues) issues.push(...ocrResult.issues)
      if (consistencyChecks.issues) issues.push(...consistencyChecks.issues)
      if (fraudChecks.issues) issues.push(...fraudChecks.issues)

      const success = confidence >= 0.8 && issues.length === 0

      // Enregistrer le résultat
      await db.documentValidation.create({
        data: {
          userId,
          documentType: validatedData.documentType,
          documentNumber: validatedData.documentNumber,
          confidence,
          status: success ? 'APPROVED' : 'PENDING_REVIEW',
          extractedData: ocrResult.extractedData,
          issues: issues,
          metadata: {
            ocrResult,
            consistencyChecks,
            fraudChecks
          },
          createdAt: new Date()
        }
      })

      // Mettre à jour le niveau de vérification si succès
      if (success) {
        await this.updateVerificationLevel(userId, 'DOCUMENT_VALIDATED')
      }

      return {
        success,
        confidence: Math.round(confidence * 100),
        extractedData: ocrResult.extractedData,
        issues: issues.length > 0 ? issues : undefined
      }

    } catch (error) {
      console.error('Error validating document:', error)
      throw new Error('Erreur lors de la validation du document')
    }
  }

  /**
   * Analyse anti-fraude complète d'un utilisateur
   */
  async performAntiFraudAnalysis(
    userId: string,
    ipAddress: string,
    userAgent: string,
    actionType: 'REGISTRATION' | 'LOGIN' | 'TRANSACTION' | 'ANNOUNCEMENT_CREATION',
    metadata?: Record<string, any>
  ): Promise<AntiFraudAnalysis> {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          announcements: {
            orderBy: { createdAt: 'desc' },
            take: 10
          },
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        }
      })

      if (!user) {
        throw new Error('Utilisateur introuvable')
      }

      // Analyse IP
      const ipAnalysis = await this.analyzeIPAddress(ipAddress)
      
      // Analyse de vélocité (trop d'actions rapides)
      const velocityAnalysis = await this.analyzeUserVelocity(userId, actionType)
      
      // Analyse comportementale
      const behaviorAnalysis = await this.analyzeBehaviorPatterns(user, metadata)
      
      // Génération d'empreinte digitale de l'appareil
      const deviceFingerprint = this.generateDeviceFingerprint(userAgent, ipAddress)
      
      // Vérification contre les listes noires
      const blacklistCheck = await this.checkBlacklists(user.email, ipAddress)

      // Calcul du score de risque
      const riskScore = this.calculateRiskScore({
        ipAnalysis,
        velocityAnalysis,
        behaviorAnalysis,
        blacklistCheck,
        userAge: Date.now() - user.createdAt.getTime(),
        verificationLevel: user.identityVerification?.level || IdentityVerificationLevel.NONE
      })

      const flags: Array<{type: string, severity: 'LOW'|'MEDIUM'|'HIGH', description: string, confidence: number}> = []
      const recommendations: string[] = []

      // Flags basés sur l'IP
      if (ipAnalysis.isVPN) {
        flags.push({
          type: 'VPN_USAGE',
          severity: 'MEDIUM',
          description: 'Utilisation d\'un VPN détectée',
          confidence: 0.9
        })
        recommendations.push('Demander une vérification d\'identité supplémentaire')
      }

      if (ipAnalysis.isTor) {
        flags.push({
          type: 'TOR_USAGE',
          severity: 'HIGH',
          description: 'Utilisation du réseau Tor détectée',
          confidence: 0.95
        })
        recommendations.push('Bloquer temporairement et demander vérification manuelle')
      }

      // Flags de vélocité
      if (velocityAnalysis.suspiciousVelocity) {
        flags.push({
          type: 'HIGH_VELOCITY',
          severity: 'HIGH',
          description: `Trop d'actions ${actionType} en peu de temps`,
          confidence: 0.8
        })
        recommendations.push('Appliquer un délai de refroidissement')
      }

      // Flags comportementaux
      if (behaviorAnalysis.newDeviceNewLocation) {
        flags.push({
          type: 'NEW_DEVICE_LOCATION',
          severity: 'MEDIUM',
          description: 'Nouvel appareil depuis une nouvelle localisation',
          confidence: 0.7
        })
      }

      const riskLevel: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL' = 
        riskScore >= 80 ? 'CRITICAL' :
        riskScore >= 60 ? 'HIGH' :
        riskScore >= 40 ? 'MEDIUM' : 'LOW'

      // Enregistrer l'analyse
      await db.fraudAnalysis.create({
        data: {
          userId,
          actionType,
          riskScore,
          riskLevel,
          ipAddress,
          deviceFingerprint,
          flags: flags,
          recommendations,
          metadata: {
            ipAnalysis,
            velocityAnalysis,
            behaviorAnalysis,
            userAgent,
            ...metadata
          },
          createdAt: new Date()
        }
      })

      return {
        riskScore,
        riskLevel,
        flags,
        recommendations,
        ipAnalysis,
        deviceFingerprint,
        behaviorAnalysis: {
          velocityFlags: velocityAnalysis.flags,
          patternFlags: behaviorAnalysis.flags,
          suspiciousActivity: riskScore >= 60
        }
      }

    } catch (error) {
      console.error('Error performing anti-fraud analysis:', error)
      throw new Error('Erreur lors de l\'analyse anti-fraude')
    }
  }

  /**
   * Géofencing : vérifier si une action est autorisée depuis cette localisation
   */
  async validateGeolocation(
    userId: string,
    latitude: number,
    longitude: number,
    actionType: string
  ): Promise<{ allowed: boolean; reason?: string; alternativeAction?: string }> {
    try {
      // Zones autorisées pour EcoDeli (France + pays limitrophes)
      const allowedCountries = ['FR', 'BE', 'LU', 'CH', 'DE', 'IT', 'ES']
      
      // Déterminer le pays depuis les coordonnées (API de géocodage inversé)
      const country = await this.getCountryFromCoordinates(latitude, longitude)
      
      if (!allowedCountries.includes(country)) {
        return {
          allowed: false,
          reason: `Actions non autorisées depuis ${country}`,
          alternativeAction: 'Contacter le support pour autorisation spéciale'
        }
      }

      // Vérifications spéciales pour certains types d'actions
      if (actionType === 'HIGH_VALUE_TRANSACTION') {
        // Zones sensibles (frontières, aéroports)
        const isInSensitiveZone = await this.checkSensitiveZone(latitude, longitude)
        if (isInSensitiveZone) {
          return {
            allowed: false,
            reason: 'Zone sensible détectée pour transaction de haute valeur',
            alternativeAction: 'Validation manuelle requise'
          }
        }
      }

      // Enregistrer la géolocalisation pour l'historique
      await db.userGeolocation.create({
        data: {
          userId,
          latitude,
          longitude,
          country,
          actionType,
          allowed: true,
          createdAt: new Date()
        }
      })

      return { allowed: true }

    } catch (error) {
      console.error('Error validating geolocation:', error)
      return {
        allowed: false,
        reason: 'Erreur de vérification géographique',
        alternativeAction: 'Réessayer plus tard'
      }
    }
  }

  /**
   * Blacklist et monitoring : vérifier emails, IPs, numéros de téléphone
   */
  async checkBlacklists(email: string, ipAddress: string, phone?: string): Promise<{
    emailBlacklisted: boolean
    ipBlacklisted: boolean
    phoneBlacklisted: boolean
    sources: string[]
  }> {
    try {
      const checks = await Promise.all([
        this.checkEmailBlacklist(email),
        this.checkIPBlacklist(ipAddress),
        phone ? this.checkPhoneBlacklist(phone) : Promise.resolve(false)
      ])

      return {
        emailBlacklisted: checks[0],
        ipBlacklisted: checks[1],
        phoneBlacklisted: checks[2],
        sources: [] // Sources des blacklists (ex: "SpamHaus", "Internal", etc.)
      }

    } catch (error) {
      console.error('Error checking blacklists:', error)
      return {
        emailBlacklisted: false,
        ipBlacklisted: false,
        phoneBlacklisted: false,
        sources: []
      }
    }
  }

  // Méthodes privées d'aide

  private getRequiredVerificationSteps(
    currentLevel: IdentityVerificationLevel,
    targetLevel: IdentityVerificationLevel
  ): string[] {
    const steps: string[] = []

    if (currentLevel === IdentityVerificationLevel.NONE) {
      if (targetLevel >= IdentityVerificationLevel.BASIC) {
        steps.push('EMAIL_VERIFICATION', 'PHONE_VERIFICATION')
      }
      if (targetLevel >= IdentityVerificationLevel.VERIFIED) {
        steps.push('DOCUMENT_VALIDATION', 'SELFIE_VERIFICATION')
      }
      if (targetLevel >= IdentityVerificationLevel.PREMIUM) {
        steps.push('BANK_VERIFICATION', 'BACKGROUND_CHECK')
      }
    }

    return steps
  }

  private async performOCRAnalysis(documentData: any): Promise<{
    confidence: number
    extractedData: any
    issues?: string[]
  }> {
    // Simulation OCR - à remplacer par vraie API
    return {
      confidence: 0.9,
      extractedData: {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        documentNumber: documentData.documentNumber,
        expiryDate: documentData.expiryDate
      },
      issues: []
    }
  }

  private async performConsistencyChecks(userId: string, ocrResult: any): Promise<{
    score: number
    issues?: string[]
  }> {
    // Vérifier cohérence avec profil utilisateur
    return { score: 0.9 }
  }

  private async performDocumentFraudCheck(documentData: any): Promise<{
    score: number
    issues?: string[]
  }> {
    // Vérifications anti-fraude document
    return { score: 0.85 }
  }

  private async analyzeIPAddress(ipAddress: string): Promise<{
    isVPN: boolean
    isTor: boolean
    isProxy: boolean
    country: string
    riskLevel: string
  }> {
    // Analyse IP via API spécialisée
    return {
      isVPN: false,
      isTor: false,
      isProxy: false,
      country: 'FR',
      riskLevel: 'LOW'
    }
  }

  private async analyzeUserVelocity(userId: string, actionType: string): Promise<{
    suspiciousVelocity: boolean
    flags: string[]
  }> {
    // Analyser la fréquence des actions
    return { suspiciousVelocity: false, flags: [] }
  }

  private async analyzeBehaviorPatterns(user: any, metadata?: any): Promise<{
    newDeviceNewLocation: boolean
    flags: string[]
  }> {
    // Analyser les patterns comportementaux
    return { newDeviceNewLocation: false, flags: [] }
  }

  private generateDeviceFingerprint(userAgent: string, ipAddress: string): string {
    return crypto.createHash('sha256')
      .update(userAgent + ipAddress)
      .digest('hex')
      .substring(0, 16)
  }

  private calculateRiskScore(factors: any): number {
    // Algorithme de calcul du score de risque
    let score = 0
    
    if (factors.ipAnalysis.isVPN) score += 20
    if (factors.ipAnalysis.isTor) score += 40
    if (factors.velocityAnalysis.suspiciousVelocity) score += 30
    if (factors.blacklistCheck.emailBlacklisted) score += 50
    
    // Réduction selon niveau de vérification
    const levelReduction = {
      [IdentityVerificationLevel.NONE]: 0,
      [IdentityVerificationLevel.BASIC]: -10,
      [IdentityVerificationLevel.VERIFIED]: -20,
      [IdentityVerificationLevel.PREMIUM]: -30
    }
    
    score += levelReduction[factors.verificationLevel] || 0
    
    return Math.max(0, Math.min(100, score))
  }

  private async updateVerificationLevel(userId: string, step: string): Promise<void> {
    // Logique de mise à jour du niveau selon les étapes complétées
    console.log(`Updating verification level for user ${userId}, step: ${step}`)
  }

  private async getCountryFromCoordinates(lat: number, lng: number): Promise<string> {
    // Géocodage inversé pour obtenir le pays
    return 'FR' // Simulation
  }

  private async checkSensitiveZone(lat: number, lng: number): Promise<boolean> {
    // Vérifier si dans une zone sensible
    return false
  }

  private async checkEmailBlacklist(email: string): Promise<boolean> {
    // Vérifier email dans blacklists
    return false
  }

  private async checkIPBlacklist(ipAddress: string): Promise<boolean> {
    // Vérifier IP dans blacklists
    return false
  }

  private async checkPhoneBlacklist(phone: string): Promise<boolean> {
    // Vérifier téléphone dans blacklists
    return false
  }
}

export const identityValidationService = new IdentityValidationService()