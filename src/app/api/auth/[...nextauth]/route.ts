import { authOptions } from "@/lib/auth";
import NextAuth from "next-auth";

// Ajout de headers CORS et options robustes pour résoudre les problèmes d'authentification
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
