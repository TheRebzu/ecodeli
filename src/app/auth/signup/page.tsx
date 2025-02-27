import { Metadata } from "next";
import SignUpForm from "@/components/auth/SignUpForm";

export const metadata: Metadata = {
  title: "Inscription | EcoDeli",
  description: "Créez votre compte EcoDeli",
};

export default function SignUpPage() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Créez votre compte
          </h1>
          <p className="text-sm text-muted-foreground">
            Rejoignez EcoDeli et profitez de nos services
          </p>
        </div>
        <SignUpForm />
      </div>
    </div>
  );
}