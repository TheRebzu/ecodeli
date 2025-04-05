import { Metadata } from "next";
import { LivreurRegisterForm } from "@/components/auth/livreur-register-form";

export const metadata: Metadata = {
  title: "Inscription Livreur | EcoDeli",
  description: "Créez votre compte livreur pour effectuer des livraisons écologiques",
};

export default function LivreurRegisterPage() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px] md:w-[600px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Inscription Livreur
          </h1>
          <p className="text-sm text-muted-foreground">
            Créez votre compte livreur et rejoignez notre équipe de livraison écologique
          </p>
        </div>
        <LivreurRegisterForm />
      </div>
    </div>
  );
} 