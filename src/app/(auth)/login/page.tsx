import { Metadata } from "next";
import LoginForm from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Connexion | EcoDeli",
  description: "Connectez-vous à votre compte EcoDeli pour accéder à nos services.",
};

export default function LoginPage() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
      <LoginForm />
    </div>
  );
} 