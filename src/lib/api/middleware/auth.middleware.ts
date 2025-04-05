import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { NextApiHandler, NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export interface AuthOptions {
  roles?: string[];
  redirectToLogin?: boolean;
  redirectUrl?: string;
}

export function withAuth(
  handler: NextApiHandler,
  options: AuthOptions = {}
): NextApiHandler {
  const { roles = [], redirectToLogin = true, redirectUrl = "/login" } = options;

  return async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getServerSession(req, res, authOptions);

    // Vérifier si l'utilisateur est authentifié
    if (!session?.user) {
      if (redirectToLogin) {
        return res.redirect(307, redirectUrl);
      }
      return res.status(401).json({ error: "Non authentifié" });
    }

    // If roles are specified, verify that user has the required role
    if (roles.length > 0) {
      const userRole = session.user.role as string;
      
      if (!userRole || !roles.includes(userRole)) {
        return res.status(403).json({ error: "Accès non autorisé" });
      }
    }

    // Authentication and authorization passed
    return handler(req, res);
  };
}

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