"use client";

import { useEffect, useState } from 'react'
import { useSession, signOut, signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from "@/hooks/use-auth";
import { useValidationSync } from "@/hooks/use-validation-sync";
import DelivererRecruitmentSystem from "@/features/deliverer/components/recruitment/deliverer-recruitment-system";
import { PageHeader } from "@/components/layout/page-header";
import { useTranslations } from "next-intl";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function DelivererRecruitmentPage() {
  // Déplacer TOUS les hooks au début du composant
  const { data: session, status, update } = useSession()
  const { user } = useAuth();
  const { isLoading: isSyncing } = useValidationSync();
  const t = useTranslations("deliverer.recruitment");
  const searchParams = useSearchParams()
  
  // États locaux
  const [isValidating, setIsValidating] = useState(false)
  const [cookieError, setCookieError] = useState(false)
  const shouldSync = searchParams.get('sync-validation') === 'true'

  // Vérifier si les cookies sont activés
  useEffect(() => {
    // Essayer de définir un cookie test
    document.cookie = "cookieTest=1; path=/; SameSite=Lax";
    const cookiesEnabled = document.cookie.indexOf("cookieTest=") !== -1;
    
    if (!cookiesEnabled) {
      console.error('❌ [COOKIES] Les cookies semblent désactivés');
      setCookieError(true);
    } else {
      console.log('✅ [COOKIES] Les cookies sont activés');
    }
    
    // Vérifier l'état de la session
    checkSessionStatus();
  }, []);
  
  // Fonction pour vérifier l'état de la session
  const checkSessionStatus = async () => {
    try {
      const response = await fetch('/api/debug/session', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 [DEBUG] État de la session:', data);
        
        // Vérifier si les cookies de session sont présents
        const hasSessionCookies = data.cookies.list.some(
          cookie => cookie.name?.includes('next-auth.session')
        );
        
        if (!hasSessionCookies) {
          console.warn('⚠️ [COOKIES] Cookie de session NextAuth non trouvé');
          setCookieError(true);
        }
      }
    } catch (error) {
      console.error('❌ [DEBUG] Erreur vérification session:', error);
    }
  };

  useEffect(() => {
    if (session?.user && shouldSync && !isValidating) {
      syncValidationStatus()
    }
  }, [session, shouldSync, isValidating])

  const syncValidationStatus = async () => {
    if (isValidating) return
    setIsValidating(true)

    try {
      console.log('🔄 [CLIENT] Tentative de synchronisation du statut de validation...')
      
      // Vérifier la cohérence avec l'API
      const response = await fetch('/api/auth/sync-validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })
      
      const result = await response.json()
      console.log('📊 [CLIENT] Résultat de la synchronisation:', result)

      if (result.needsRefresh && result.freshValidationStatus === 'VALIDATED') {
        console.log('🔄 [CLIENT] Token JWT obsolète, forçage de la reconnexion...')
        
        // Sauvegarder les données de connexion
        const email = session?.user?.email
        
        // Se déconnecter et se reconnecter automatiquement
        await signOut({ redirect: false })
        
        // Petit délai avant reconnexion
        setTimeout(async () => {
          window.location.reload()
        }, 1000)
      }
    } catch (error) {
      console.error('❌ [CLIENT] Erreur lors de la synchronisation:', error)
    } finally {
      setIsValidating(false)
    }
  }

  const handleRefreshSession = async () => {
    try {
      toast({
        title: "Rafraîchissement de la session",
        description: "Tentative de récupération de votre session..."
      });
      
      // Forcer une mise à jour de la session
      await update();
      
      // Vérifier à nouveau l'état de la session
      await checkSessionStatus();
      
      // Recharger la page après un court délai
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('❌ [SESSION] Erreur de rafraîchissement:', error);
      toast({
        title: "Échec du rafraîchissement",
        description: "Impossible de récupérer votre session. Veuillez vous reconnecter.",
        variant: "destructive"
      });
    }
  };

  // Rendu conditionnel après tous les hooks
  if (cookieError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Alert variant="destructive" className="max-w-md mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Problème de cookies</AlertTitle>
          <AlertDescription>
            Les cookies semblent être désactivés ou bloqués dans votre navigateur.
            Veuillez les activer pour continuer à utiliser l'application.
          </AlertDescription>
        </Alert>
        
        <div className="flex flex-col gap-2 mt-4">
          <Button onClick={handleRefreshSession} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Rafraîchir la session
          </Button>
          
          <Button variant="outline" onClick={() => window.location.href = '/fr/login'}>
            Retour à la connexion
          </Button>
        </div>
      </div>
    );
  }

  if (status === 'loading' || isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isValidating ? 'Synchronisation du statut de validation...' : 'Chargement...'}
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            {t("auth.required_title")}
          </h2>
          <p className="text-gray-600">{t("auth.required_description")}</p>
          <Button 
            onClick={() => window.location.href = '/fr/login'} 
            className="mt-4"
          >
            Se connecter
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("page.title")} description={t("page.description")} />

      {isSyncing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-blue-800 text-sm">
              Synchronisation des données en cours...
            </span>
          </div>
        </div>
      )}

      <DelivererRecruitmentSystem userId={user.id} />
    </div>
  );
}
