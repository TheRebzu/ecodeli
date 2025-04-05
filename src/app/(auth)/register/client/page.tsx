import { Metadata } from "next";
import { ClientRegisterForm } from "@/components/auth/client-register-form";

export const metadata: Metadata = {
  title: "Inscription Client | EcoDeli",
  description: "Créez votre compte client pour commander auprès des commerces locaux",
};

export default function ClientRegisterPage() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px] md:w-[500px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Inscription Client
          </h1>
          <p className="text-sm text-muted-foreground">
            Créez votre compte client pour profiter de nos services de livraison éco-responsable
          </p>
        </div>
        <ClientRegisterForm />
      </div>
    </div>
  );
} 