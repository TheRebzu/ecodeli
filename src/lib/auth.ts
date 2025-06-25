// Simple JWT Auth for EcoDeli - Compatibility file
// This file exports the simple JWT auth functions to maintain compatibility

export {
  generateToken,
  verifyToken,
  getCurrentUser,
  signIn,
  signUp,
  signOut,
  requireAuth,
  requireRole
} from "./auth-simple"

export type {
  AuthUser,
  JWTPayload
} from "./auth-simple"

// Re-export UserRole from Prisma for compatibility
export { UserRole } from "@prisma/client"

// Default export for compatibility
import * as authSimple from "./auth-simple"
export default authSimple 