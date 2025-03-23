import { authOptions } from "@/lib/auth";
import NextAuth from "next-auth";

<<<<<<< HEAD
const authConfig: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
=======
const handler = NextAuth(authOptions);
>>>>>>> 5b14b134948ec7b19d55a9a8fff5829e7f796b19

export { handler as GET, handler as POST };
