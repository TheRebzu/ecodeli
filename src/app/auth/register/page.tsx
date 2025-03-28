import { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";
import { AuthCard } from "@/components/auth/auth-card";

export const metadata: Metadata = {
  title: "Inscription",
  description: "Créez un nouveau compte",
};

export default function RegisterPage() {
  return (
    <>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Créer un compte
        </h1>
        <p className="text-sm text-muted-foreground">
          Remplissez le formulaire ci-dessous pour créer votre compte
        </p>
      </div>
      <AuthCard>
        <RegisterForm />
      </AuthCard>
    </>
  );
} 