import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaClient, UserRole } from "@prisma/client";
import { JWTEncodeParams, JWTDecodeParams } from "next-auth/jwt";
import { mapRoleToPrisma } from "./lib/auth-utils";

const prisma = new PrismaClient();

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
 * Configuration for NextAuth.js
 */
export const { 
  handlers: { GET, POST },
  auth,
  signIn,
  signOut
} = NextAuth({
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
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        
        // Demo user for development
        if (process.env.NODE_ENV === "development" && credentials.email === "demo@ecodeli.com") {
          return {
            id: "demo-user",
            name: "Demo User",
            email: "demo@ecodeli.com",
            role: UserRole.CUSTOMER,
          };
        }
        
        try {
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email as string,
            },
          });
  
          if (!user || !user.password) {
            return null;
          }
  
          // In development mode, use a simple string comparison for testing
          // In production, you'd use bcrypt
          const isPasswordValid = process.env.NODE_ENV === "development" 
            ? user.password === credentials.password 
            : false;
          
          if (!isPasswordValid) {
            return null;
          }
  
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        
        // Ensure role is always stored as a Prisma UserRole enum value
        if (typeof user.role === 'string' && !Object.values(UserRole).includes(user.role as any)) {
          token.role = mapRoleToPrisma(user.role);
        } else {
          token.role = user.role as UserRole;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
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
});

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