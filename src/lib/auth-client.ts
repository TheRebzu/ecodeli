'use client'

import { createAuthClient } from "better-auth/client"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
})

// Export des types pour utilisation
export type Session = typeof authClient.$Infer.Session
export type User = typeof authClient.$Infer.User

// Types pour EcoDeli
export type UserRole = "CLIENT" | "DELIVERER" | "MERCHANT" | "PROVIDER" | "ADMIN"
export type ValidationStatus = "PENDING" | "PENDING_DOCUMENTS" | "PENDING_VALIDATION" | "VALIDATED" | "REJECTED" 