import { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Connexion | EcoDeli",
  description: "Connectez-vous à votre compte EcoDeli",
};

export default function LoginPage() {
  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center px-4 py-8 md:py-0">
      <div className="w-full max-w-md">
        <div className="flex flex-col space-y-2 text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Connexion à votre compte
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Saisissez vos identifiants pour vous connecter
          </p>
        </div>
        
        <LoginForm />
        
        <div className="mt-8 space-y-4 text-sm text-center">
          <p className="text-muted-foreground">
            Pas encore de compte ?{" "}
            <Link
              href="/register"
              className="underline underline-offset-4 hover:text-primary"
            >
              Créez-en un
            </Link>
          </p>
          <p className="text-muted-foreground">
            <Link
              href="/forgot-password"
              className="underline underline-offset-4 hover:text-primary"
            >
              Mot de passe oublié ?
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 