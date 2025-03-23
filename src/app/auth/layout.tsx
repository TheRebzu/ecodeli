"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, redirectToDashboard } = useAuth();

  // Rediriger vers le dashboard si l'utilisateur est déjà connecté
  useEffect(() => {
    if (isAuthenticated) {
      redirectToDashboard();
    }
  }, [isAuthenticated, redirectToDashboard]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Logo et navigation en haut */}
      <header className="p-6">
        <div className="container flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <Image 
              src="/images/logo.svg" 
              alt="EcoDeli Logo" 
              width={40} 
              height={40}
              className="dark:invert"
            />
            <span className="font-bold text-xl">EcoDeli</span>
          </Link>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="flex-1 flex items-center justify-center py-12">
        <div className="auth-container relative w-full max-w-4xl mx-auto grid md:grid-cols-2 gap-8 px-4">
          {/* Section gauche: illustration et description */}
          <div className="hidden md:flex flex-col justify-center p-10 bg-gradient-to-br from-primary/50 to-primary rounded-lg text-white">
            <div className="space-y-4">
              <h1 className="text-3xl font-bold">Bienvenue sur EcoDeli</h1>
              <p className="text-white/90">
                La plateforme de crowdshipping écologique qui révolutionne la livraison urbaine.
              </p>
              <div className="space-y-3 mt-6">
                <div className="flex items-start gap-2">
                  <svg 
                    className="h-5 w-5 text-white/90 mt-0.5" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-white/90">Livraisons rapides et écologiques</p>
                </div>
                <div className="flex items-start gap-2">
                  <svg 
                    className="h-5 w-5 text-white/90 mt-0.5" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-white/90">Opportunités de revenus complémentaires</p>
                </div>
                <div className="flex items-start gap-2">
                  <svg 
                    className="h-5 w-5 text-white/90 mt-0.5" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-white/90">Services à la personne et livraison de colis</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Section droite: formulaire d'authentification */}
          <div className="bg-card rounded-lg shadow-sm p-8 flex flex-col justify-center">
            {children}
          </div>
        </div>
      </main>

      {/* Footer avec liens légaux */}
      <footer className="py-6">
        <div className="container flex flex-col md:flex-row justify-center items-center gap-4 text-sm text-muted-foreground">
          <Link href="/terms" className="hover:text-primary">
            Conditions d&apos;utilisation
          </Link>
          <span className="hidden md:inline">•</span>
          <Link href="/privacy" className="hover:text-primary">
            Politique de confidentialité
          </Link>
          <span className="hidden md:inline">•</span>
          <Link href="/help" className="hover:text-primary">
            Centre d&apos;aide
          </Link>
        </div>
      </footer>
    </div>
  );
} 