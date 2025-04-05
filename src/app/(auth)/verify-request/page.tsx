import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Vérifiez votre email | EcoDeli",
  description: "Consultez votre boîte de réception pour vérifier votre email",
};

export default function VerifyRequestPage() {
  return (
    <>
      <div className="flex flex-col items-center justify-center space-y-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mx-auto">
          <Mail className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Vérifiez votre email</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          Nous avons envoyé un lien de vérification à votre adresse email. 
          Veuillez consulter votre boîte de réception et cliquer sur ce lien pour confirmer votre demande.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Button asChild variant="default">
            <Link href="/(auth)/login">Retour à la connexion</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Retour à l&apos;accueil</Link>
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Vous n&apos;avez pas reçu d&apos;email ? Vérifiez votre dossier spam ou{" "}
          <Link href="/(auth)/login" className="underline underline-offset-4 hover:text-primary">
            réessayez
          </Link>
        </p>
      </div>
    </>
  );
} 