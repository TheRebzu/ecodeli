import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

interface AuthOptions {
  roles?: string[];
  redirectToLogin?: boolean;
  redirectUrl?: string;
}

export const withAuth = (options: AuthOptions = {}) => {
  return async (req: NextRequest) => {
    const { roles = [], redirectToLogin = true, redirectUrl = "/auth/login" } = options;
    
    try {
      // Get the authentication token from the request
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      
      // No token means user is not authenticated
      if (!token) {
        if (redirectToLogin) {
          // Redirect to login page with the return url
          const returnUrl = encodeURIComponent(req.nextUrl.pathname);
          return NextResponse.redirect(new URL(`${redirectUrl}?returnUrl=${returnUrl}`, req.url));
        } else {
          // Return unauthorized response
          return NextResponse.json(
            { success: false, message: "Non authentifié" },
            { status: 401 }
          );
        }
      }
      
      // If roles are specified, verify that user has the required role
      if (roles.length > 0) {
        const userRole = token.role as string;
        
        if (!userRole || !roles.includes(userRole)) {
          return NextResponse.json(
            { success: false, message: "Accès non autorisé" },
            { status: 403 }
          );
        }
      }
      
      // Authentication and authorization passed
      return NextResponse.next();
    } catch (error) {
      console.error("Auth middleware error:", error);
      
      // Return error response
      return NextResponse.json(
        { success: false, message: "Erreur d'authentification" },
        { status: 500 }
      );
    }
  };
};

export const isAuthenticated = async (req: NextRequest) => {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    return !!token;
  } catch (error) {
    console.error("isAuthenticated error:", error);
    return false;
  }
};

export const getAuthUser = async (req: NextRequest) => {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    return token;
  } catch (error) {
    console.error("getAuthUser error:", error);
    return null;
  }
}; 