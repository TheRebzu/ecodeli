import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers"
import { prisma } from "./db"
import { UserRole } from "@prisma/client"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"
const COOKIE_NAME = "auth-token"

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  emailVerified: boolean
}

export interface JWTPayload {
  userId: string
  email: string
  role: UserRole
  iat?: number
  exp?: number
}

/**
 * Générer un token JWT
 */
export function generateToken(user: AuthUser): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "7d" // 7 jours
  })
}

/**
 * Vérifier et décoder un token JWT
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    return decoded
  } catch (error) {
    console.error("Erreur vérification token:", error)
    return null
  }
}

/**
 * Obtenir l'utilisateur actuel depuis le cookie
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value

    if (!token) {
      return null
    }

    const payload = verifyToken(token)
    if (!payload) {
      return null
    }

    // Vérifier que l'utilisateur existe toujours en base
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    })

    if (!user) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified
    }
  } catch (error) {
    console.error("Erreur getCurrentUser:", error)
    return null
  }
}

/**
 * Connecter un utilisateur avec email/password
 */
export async function signIn(email: string, password: string): Promise<{
  success: boolean
  user?: AuthUser
  token?: string
  error?: string
}> {
  try {
    // Chercher l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return {
        success: false,
        error: "Email ou mot de passe incorrect"
      }
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return {
        success: false,
        error: "Email ou mot de passe incorrect"
      }
    }

    // Créer le token
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified
    }

    const token = generateToken(authUser)

    // Mettre à jour la dernière connexion
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    return {
      success: true,
      user: authUser,
      token
    }
  } catch (error) {
    console.error("Erreur signIn:", error)
    return {
      success: false,
      error: "Erreur de connexion"
    }
  }
}

/**
 * Créer un nouvel utilisateur
 */
export async function signUp(data: {
  email: string
  password: string
  role?: UserRole
}): Promise<{
  success: boolean
  user?: AuthUser
  token?: string
  error?: string
}> {
  try {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    })

    if (existingUser) {
      return {
        success: false,
        error: "Un compte avec cet email existe déjà"
      }
    }

    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(data.password, 12)

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        role: data.role || "CLIENT",
        emailVerified: false
      }
    })

    // Créer le profil associé
    await prisma.profile.create({
      data: {
        userId: user.id
      }
    })

    // Créer le profil spécialisé selon le rôle
    if (user.role === "CLIENT") {
      await prisma.client.create({
        data: {
          userId: user.id,
          subscriptionPlan: "FREE",
          tutorialCompleted: false
        }
      })
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified
    }

    const token = generateToken(authUser)

    return {
      success: true,
      user: authUser,
      token
    }
  } catch (error) {
    console.error("Erreur signUp:", error)
    return {
      success: false,
      error: "Erreur lors de la création du compte"
    }
  }
}

/**
 * Déconnecter l'utilisateur (côté serveur)
 */
export async function signOut(): Promise<void> {
  const cookieStore = cookies()
  cookieStore.delete(COOKIE_NAME)
}

/**
 * Middleware pour vérifier l'authentification
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Non authentifié")
  }
  return user
}

/**
 * Middleware pour vérifier un rôle spécifique
 */
export async function requireRole(role: UserRole): Promise<AuthUser> {
  const user = await requireAuth()
  if (user.role !== role) {
    throw new Error("Permissions insuffisantes")
  }
  return user
}

export { COOKIE_NAME } 