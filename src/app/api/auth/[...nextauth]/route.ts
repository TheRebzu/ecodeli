import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Gestionnaire d'authentification NextAuth
// Ce fichier est utilisé par Next.js pour gérer les routes d'authentification
// Il utilise la configuration définie dans @/lib/auth

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
