import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "Erreur d'authentification | EcoDeli",
  description: "Une erreur s'est produite lors de l'authentification",
};

export default function AuthErrorPage() {
  return (
    <>
      <div className="flex flex-col items-center justify-center space-y-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 mx-auto">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Erreur d&apos;authentification</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          Une erreur s&apos;est produite lors de l&apos;authentification. Veuillez réessayer ou contacter l&apos;assistance si le problème persiste.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Button asChild variant="default">
            <Link href="/login">Retour à la connexion</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Retour à l&apos;accueil</Link>
          </Button>
        </div>
      </div>
    </>
  );
} 