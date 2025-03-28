import { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { AuthCard } from "@/components/auth/auth-card";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connectez-vous à votre compte",
};

export default function LoginPage() {
  return (
    <>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Bienvenue
        </h1>
        <p className="text-sm text-muted-foreground">
          Connectez-vous pour accéder à votre compte
        </p>
      </div>
      <AuthCard>
        <LoginForm />
      </AuthCard>
    </>
  );
} 