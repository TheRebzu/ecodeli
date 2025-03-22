import Link from "next/link";
import { getSession } from "@/lib/session-helper";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { LoginForm } from "@/components/forms/login-form";

export default async function LoginPage() {
  // Vérifier si l'utilisateur est déjà connecté
  const session = await getSession();
  
  // Si l'utilisateur est déjà connecté, afficher un message et un lien vers le tableau de bord
  if (session) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center w-full">
        <div className="mx-auto flex w-full max-w-sm flex-col justify-center space-y-6 px-4">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Vous êtes déjà connecté</h1>
            <p className="text-sm text-muted-foreground">
              Vous êtes déjà connecté en tant que {session.user.name}.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retourner au tableau de bord
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-10 px-4 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 space-y-2 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Connexion</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Entrez vos identifiants pour accéder à votre compte
          </p>
        </div>

        <div className="mx-auto bg-card rounded-lg border shadow-md p-6 sm:p-8">
          <LoginForm />
          
          <div className="mt-6 text-center text-sm">
            <p className="text-muted-foreground">
              Vous n&apos;avez pas de compte ?{" "}
              <Link 
                href="/register" 
                className="text-primary hover:underline font-medium inline-flex items-center"
              >
                Inscrivez-vous
              </Link>
            </p>
          </div>
        </div>
        
        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>
            En vous connectant, vous acceptez nos{" "}
            <Link href="/legal/terms" className="underline hover:text-primary">
              Conditions d&apos;utilisation
            </Link>{" "}
            et notre{" "}
            <Link href="/legal/privacy" className="underline hover:text-primary">
              Politique de confidentialité
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 