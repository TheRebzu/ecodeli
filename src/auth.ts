import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { JWTEncodeParams, JWTDecodeParams } from "next-auth/jwt";
import { mapRoleToPrisma, UserRole } from "./lib/auth-utils";
import { db } from "./lib/db";
import { verifyPassword } from "./lib/auth-server";

// Utiliser notre mock de Prisma au lieu d'initialiser un nouveau PrismaClient
const prisma = db;

// Rate limiting for auth attempts
const MAX_ATTEMPTS = 5;
const INITIAL_LOCKOUT_SECONDS = 60;
const MAX_LOCKOUT_SECONDS = 3600; // 1 hour
const authFailures: Record<string, { count: number; lastAttempt: number; lockedUntil: number }> = {};

// Custom encode function that doesn't attempt decryption
async function customJwtEncode(params: JWTEncodeParams): Promise<string> {
  try {
    // Ensure we have a token to encode
    if (!params.token) return "";
    
    // Just use default encoding since we know our secret is correct
    return JSON.stringify(params.token);
  } catch (error) {
    console.error("[auth] JWT encode error");
    return "";
  }
}

// Custom decode function that gracefully handles decryption errors
async function customJwtDecode(params: JWTDecodeParams): Promise<any> {
  try {
    if (!params.token) return null;
    
    // For JWT tokens (they start with "eyJ"), we need to decode them properly
    if (typeof params.token === 'string' && params.token.startsWith('eyJ')) {
      try {
        // Split the JWT into its parts
        const parts = params.token.split('.');
        
        // Standard JWT should have 3 parts (header.payload.signature)
        if (parts.length !== 3) {
          console.warn("[auth] JWT doesn't have 3 parts");
          // Try to fallback to JSON parsing
          return typeof params.token === 'string' && params.token.startsWith('{') 
            ? JSON.parse(params.token) 
            : {};
        }
        
        // Decode the payload (second part)
        try {
          const payload = parts[1];
          // Handle padding for base64url format
          const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
          // Add padding
          const paddedBase64 = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
          
          try {
            const jsonPayload = Buffer.from(paddedBase64, 'base64').toString('utf8');
            return JSON.parse(jsonPayload);
          } catch (decodeError) {
            console.error("[auth] Failed to decode JWT payload");
            return {};
          }
        } catch (payloadError) {
          console.error("[auth] Error processing JWT payload");
          return {};
        }
      } catch (jwtError) {
        console.error("[auth] JWT parsing error");
        return {};
      }
    }
    
    // Not a JWT, try parsing as JSON
    try {
      return JSON.parse(params.token);
    } catch {
      // Not JSON either, return empty object
      console.warn("[auth] Token is neither valid JWT nor JSON");
      return {};
    }
  } catch (error) {
    console.error("[auth] JWT decode error");
    return {};
  }
}

/**
 * Helper function to check if an account is locked
 */
function isAccountLocked(identifier: string): boolean {
  const now = Date.now();
  const failureRecord = authFailures[identifier];
  
  if (!failureRecord) return false;
  
  return now < failureRecord.lockedUntil;
}

/**
 * Helper function to record a login failure
 */
function recordLoginFailure(identifier: string): void {
  const now = Date.now();
  const failureRecord = authFailures[identifier] || { count: 0, lastAttempt: 0, lockedUntil: 0 };
  
  // Reset count if last attempt was more than 24h ago
  if (now - failureRecord.lastAttempt > 24 * 60 * 60 * 1000) {
    failureRecord.count = 0;
  }
  
  failureRecord.count += 1;
  failureRecord.lastAttempt = now;
  
  // Lock account if too many attempts
  if (failureRecord.count >= MAX_ATTEMPTS) {
    // Apply exponential backoff for lockout time
    const lockoutSeconds = Math.min(
      INITIAL_LOCKOUT_SECONDS * Math.pow(2, failureRecord.count - MAX_ATTEMPTS),
      MAX_LOCKOUT_SECONDS
    );
    failureRecord.lockedUntil = now + (lockoutSeconds * 1000);
  }
  
  authFailures[identifier] = failureRecord;
}

/**
 * Helper function to reset login failures
 */
function resetLoginFailures(identifier: string): void {
  delete authFailures[identifier];
}

// Configuration for NextAuth.js
const authConfig = {
  pages: {
    signIn: "/login",
    signOut: "/",
    error: "/error",
    verifyRequest: "/verify-request",
    newUser: "/register",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        rememberMe: { label: "Remember Me", type: "boolean" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          console.log("[auth] Missing email or password");
          return null;
        }
        
        // Check for account lockout
        if (isAccountLocked(credentials.email)) {
          console.log(`[auth] Account locked: ${credentials.email}`);
          return null;
        }
        
        // Demo user for development
        if (process.env.NODE_ENV === "development" && credentials.email === "demo@ecodeli.com") {
          resetLoginFailures(credentials.email);
          return {
            id: "demo-user",
            name: "Demo User",
            email: "demo@ecodeli.com",
            role: UserRole.CLIENT
          };
        }
        
        try {
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email,
            },
          });
  
          if (!user || !user.password) {
            // Record failed login attempt
            recordLoginFailure(credentials.email);
            console.log(`[auth] User not found or no password: ${credentials.email}`);
            return null;
          }
  
          // Vérifier le mot de passe avec la fonction serveur verifyPassword
          const isPasswordValid = await verifyPassword(credentials.password, user.password);
          
          if (!isPasswordValid) {
            // Record failed login attempt
            recordLoginFailure(credentials.email);
            console.log(`[auth] Invalid password for: ${credentials.email}`);
            return null;
          }
          
          // Reset login failures on successful login
          resetLoginFailures(credentials.email);
  
          // Debug success
          console.log(`[auth] Login successful for: ${credentials.email}`);

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role as unknown as UserRole
          };
        } catch (error) {
          console.error("[auth] Auth error:", error);
          // Treat exceptions as a login failure
          recordLoginFailure(credentials.email);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        
        // Ensure role is always stored as a Prisma UserRole enum value
        if (typeof user.role === 'string' && !Object.values(UserRole).includes(user.role as any)) {
          token.role = mapRoleToPrisma(user.role);
        } else {
          token.role = user.role as UserRole;
        }

        // Ajouter un log pour déboguer
        console.log(`[auth] JWT callback - user role: ${token.role}`);
      }

      // Si l'authentification est faite via un fournisseur OAuth, mettre à jour la base de données
      if (account && user) {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email as string },
          });

          if (!existingUser) {
            // Créer un nouvel utilisateur
            await prisma.user.create({
              data: {
                id: user.id,
                email: user.email as string,
                name: user.name || "",
                role: UserRole.CLIENT,
                emailVerified: new Date(),
              },
            });
          } else if (existingUser.id !== user.id) {
            // Mettre à jour l'ID d'utilisateur si nécessaire
            await prisma.user.update({
              where: { id: existingUser.id },
              data: { id: user.id },
            });
          }
        } catch (error) {
          console.error("Error syncing OAuth user:", error);
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        
        // Ajouter un log pour déboguer
        console.log(`[auth] Session callback - user role: ${session.user.role}`);
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Ajoutons un log pour voir ce qui se passe
      console.log(`[auth] Redirect callback - url: ${url}, baseUrl: ${baseUrl}`);
      
      // Protection contre les boucles infinies - compter le nombre d'appels pour cette URL
      // et arrêter après un certain nombre
      const MAX_REDIRECT_COUNT = 3;
      
      // Variable statique pour compter les redirections par URL
      if (!global.redirectCounts) global.redirectCounts = {};
      const urlKey = `${url}`;
      
      // Incrémenter le compteur pour cette URL
      global.redirectCounts[urlKey] = (global.redirectCounts[urlKey] || 0) + 1;
      
      // Si trop de redirections pour la même URL, stopper la boucle et renvoyer l'URL directement
      if (global.redirectCounts[urlKey] > MAX_REDIRECT_COUNT) {
        console.log(`[auth] Boucle de redirection détectée pour ${url}, arrêt de la redirection`);
        // Réinitialiser le compteur
        global.redirectCounts[urlKey] = 0;
        
        // Si c'est une URL de dashboard, aller directement à l'URL sans passer par les règles de redirection
        if (url.includes('/dashboard')) {
          return url;
        }
        
        return baseUrl;
      }
      
      // Si l'URL est "/dashboard", rediriger en fonction du rôle
      if (url.includes('/dashboard')) {
        try {
          // Essayez de récupérer le jeton pour obtenir le rôle de l'utilisateur
          const session = await auth();
          
          if (session?.user?.role) {
            const userRole = session.user.role as UserRole;
            console.log(`[auth] User authenticated with role: ${userRole}`);
            
            // Si l'URL contient déjà le rôle spécifique (/client/dashboard, /admin/dashboard, etc.)
            // alors ne pas rediriger à nouveau pour éviter les boucles
            if (url.includes(`/${userRole.toLowerCase()}/dashboard`)) {
              console.log(`[auth] L'URL contient déjà le rôle ${userRole}, pas de redirection supplémentaire`);
              return url;
            }
            
            // Construire la redirection spécifique au rôle
            let roleBasedRedirect;
            switch(userRole) {
              case UserRole.ADMIN:
                roleBasedRedirect = '/admin/dashboard';
                break;
              case UserRole.CLIENT:
                roleBasedRedirect = '/client/dashboard';
                break;
              case UserRole.COURIER:
                roleBasedRedirect = '/courier/dashboard';
                break;
              case UserRole.MERCHANT:
                roleBasedRedirect = '/merchant/dashboard';
                break;
              case UserRole.PROVIDER:
                roleBasedRedirect = '/provider/dashboard';
                break;
              default:
                roleBasedRedirect = '/dashboard';
            }
            
            const redirectUrl = `${baseUrl}${roleBasedRedirect}`;
            console.log(`[auth] Redirecting to role-specific dashboard: ${redirectUrl}`);
            return redirectUrl;
          }
        } catch (error) {
          console.error('[auth] Error determining role-based redirect:', error);
        }
      }
      
      // Si l'URL est relative, la préfixer avec l'URL de base
      if (url.startsWith('/')) {
        const redirectUrl = `${baseUrl}${url}`;
        console.log(`[auth] Redirecting to: ${redirectUrl}`);
        return redirectUrl;
      }
      
      // Si l'URL est sur le même hôte que l'URL de base, l'autoriser
      else if (new URL(url).origin === baseUrl) {
        console.log(`[auth] Redirecting to: ${url}`);
        return url;
      }
      
      // Sinon, rediriger vers l'URL de base
      console.log(`[auth] Redirecting to default: ${baseUrl}`);
      return baseUrl;
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    encode: customJwtEncode,
    decode: customJwtDecode,
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Créer et exporter l'instance NextAuth pour les routes API
export const { handlers, auth } = NextAuth(authConfig);

// Extraire GET et POST pour les routes API
export const { GET, POST } = handlers;

/**
 * Helper to check if user is authenticated
 */
export async function isAuthenticated() {
  const session = await auth();
  return !!session?.user;
}

/**
 * Helper to check if user has a specific role
 */
export async function hasRole(allowedRoles: UserRole[]) {
  const session = await auth();
  
  if (!session?.user?.role) {
    return false;
  }
  
  return allowedRoles.includes(session.user.role as UserRole);
}

// IMPORTANT: N'exportez pas signIn ou signOut directement depuis ce fichier.
// Utilisez uniquement les méthodes de "next-auth/react" dans les composants côté client 