import { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Inscription | EcoDeli",
  description: "Créez un compte sur EcoDeli pour commencer à utiliser nos services.",
};

export default function RegisterPage() {
  return (
    <div className="w-full h-screen">
      <RegisterForm />
    </div>
  );
} 