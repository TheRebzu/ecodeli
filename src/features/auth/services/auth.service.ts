import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { UserRole, UserStatus } from "@/lib/auth"

/**
 * Service d'authentification pour EcoDeli
 */
export class AuthService {
  
  /**
   * Obtenir l'utilisateur connecté avec son profil complet
   */
  static async getCurrentUser(headers: Headers) {
    try {
      const session = await auth.api.getSession({ headers })
      
      if (!session) {
        return null
      }
      
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          profile: true,
          clientProfile: true,
          delivererProfile: true,
          merchantProfile: true,
          providerProfile: true,
          subscription: true
        }
      })
      
      return user
    } catch (error) {
      console.error("Erreur lors de la récupération de l'utilisateur:", error)
      return null
    }
  }
  
  /**
   * Valider un utilisateur (ADMIN seulement)
   */
  static async validateUser(userId: string, adminId: string) {
    try {
      // Vérifier que l'admin a les droits
      const admin = await prisma.user.findUnique({
        where: { id: adminId }
      })
      
      if (!admin || admin.role !== "ADMIN") {
        throw new Error("Accès refusé")
      }
      
      // Mettre à jour le statut de l'utilisateur
      const user = await prisma.user.update({
        where: { id: userId },
        data: { 
          status: "ACTIVE",
          emailVerified: true
        },
        include: {
          delivererProfile: true,
          providerProfile: true
        }
      })
      
      // Actions spécifiques selon le rôle
      if (user.role === "DELIVERER" && user.delivererProfile) {
        // Générer une carte NFC pour le livreur
        const nfcCardId = this.generateNfcCardId()
        
        await prisma.delivererProfile.update({
          where: { userId },
          data: {
            isVerified: true,
            isAvailable: true,
            nfcCardId
          }
        })
        
        // TODO: Déclencher génération physique de la carte NFC
        
        return { ...user, nfcCardId }
      }
      
      if (user.role === "PROVIDER" && user.providerProfile) {
        await prisma.providerProfile.update({
          where: { userId },
          data: {
            isVerified: true
          }
        })
      }
      
      return user
    } catch (error) {
      console.error("Erreur validation utilisateur:", error)
      throw error
    }
  }
  
  /**
   * Rejeter un utilisateur (ADMIN seulement)
   */
  static async rejectUser(userId: string, adminId: string, reason: string) {
    try {
      // Vérifier que l'admin a les droits
      const admin = await prisma.user.findUnique({
        where: { id: adminId }
      })
      
      if (!admin || admin.role !== "ADMIN") {
        throw new Error("Accès refusé")
      }
      
      // Mettre à jour le statut
      const user = await prisma.user.update({
        where: { id: userId },
        data: { 
          status: "SUSPENDED"
        }
      })
      
      // Créer une notification pour l'utilisateur
      await prisma.notification.create({
        data: {
          userId,
          title: "Inscription rejetée",
          message: `Votre inscription a été rejetée: ${reason}`,
          type: "ACCOUNT_STATUS",
          read: false
        }
      })
      
      // TODO: Envoyer email de notification
      
      return user
    } catch (error) {
      console.error("Erreur rejet utilisateur:", error)
      throw error
    }
  }
  
  /**
   * Suspendre un utilisateur
   */
  static async suspendUser(userId: string, adminId: string, reason: string) {
    try {
      const admin = await prisma.user.findUnique({
        where: { id: adminId }
      })
      
      if (!admin || admin.role !== "ADMIN") {
        throw new Error("Accès refusé")
      }
      
      const user = await prisma.user.update({
        where: { id: userId },
        data: { status: "SUSPENDED" }
      })
      
      await prisma.notification.create({
        data: {
          userId,
          title: "Compte suspendu", 
          message: `Votre compte a été suspendu: ${reason}`,
          type: "ACCOUNT_STATUS",
          read: false
        }
      })
      
      return user
    } catch (error) {
      console.error("Erreur suspension utilisateur:", error)
      throw error
    }
  }
  
  /**
   * Vérifier les permissions d'un utilisateur
   */
  static async checkPermissions(userId: string, requiredRole: UserRole[]): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })
      
      if (!user || user.status !== "ACTIVE") {
        return false
      }
      
      return requiredRole.includes(user.role as UserRole)
    } catch (error) {
      console.error("Erreur vérification permissions:", error)
      return false
    }
  }
  
  /**
   * Obtenir les utilisateurs en attente de validation
   */
  static async getPendingUsers() {
    try {
      return await prisma.user.findMany({
        where: { 
          status: "PENDING",
          role: { in: ["DELIVERER", "PROVIDER"] }
        },
        include: {
          profile: true,
          delivererProfile: true,
          providerProfile: true,
          documents: {
            where: { status: "PENDING" }
          }
        },
        orderBy: { createdAt: "asc" }
      })
    } catch (error) {
      console.error("Erreur récupération utilisateurs en attente:", error)
      throw error
    }
  }
  
  /**
   * Compléter le tutoriel client
   */
  static async completeTutorial(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { clientProfile: true }
      })
      
      if (!user || user.role !== "CLIENT") {
        throw new Error("Utilisateur non trouvé ou rôle incorrect")
      }
      
      await prisma.clientProfile.update({
        where: { userId },
        data: { tutorialCompleted: true }
      })
      
      return true
    } catch (error) {
      console.error("Erreur completion tutoriel:", error)
      throw error
    }
  }
  
  /**
   * Générer un ID de carte NFC unique
   */
  private static generateNfcCardId(): string {
    const prefix = "ECODELI"
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substr(2, 4).toUpperCase()
    return `${prefix}_${timestamp}_${random}`
  }
  
  /**
   * Statistiques des utilisateurs pour l'admin
   */
  static async getUserStats() {
    try {
      const stats = await prisma.user.groupBy({
        by: ['role', 'status'],
        _count: true
      })
      
      const totalUsers = await prisma.user.count()
      const activeUsers = await prisma.user.count({
        where: { status: "ACTIVE" }
      })
      const pendingUsers = await prisma.user.count({
        where: { status: "PENDING" }
      })
      
      return {
        total: totalUsers,
        active: activeUsers,
        pending: pendingUsers,
        byRole: stats
      }
    } catch (error) {
      console.error("Erreur statistiques utilisateurs:", error)
      throw error
    }
  }
} 