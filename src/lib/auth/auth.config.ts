import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    error: "/error",
    verifyRequest: "/verify-request",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isOnProtectedRoute = 
        request.nextUrl.pathname.startsWith("/dashboard") ||
        request.nextUrl.pathname.startsWith("/admin") ||
        request.nextUrl.pathname.startsWith("/profile");
        
      if (isOnProtectedRoute && !isLoggedIn) {
        return false;
      }
      
      return true;
    },
  },
}; 