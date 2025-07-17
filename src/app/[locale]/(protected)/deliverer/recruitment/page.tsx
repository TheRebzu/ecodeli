"use client";

import { useEffect, useState, useRef } from 'react'
import { useSession, signOut, signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from "@/hooks/use-auth";
import DelivererRecruitmentSystem from "@/features/deliverer/components/recruitment/deliverer-recruitment-system";
import { PageHeader } from "@/components/layout/page-header";
import { useTranslations } from "next-intl";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw, Database } from "lucide-react";

export default function DelivererRecruitmentPage() {
  // Déplacer TOUS les hooks au début du composant
  const { data: session, status, update } = useSession()
  const { user } = useAuth();
  const t = useTranslations("deliverer.recruitment");
  const searchParams = useSearchParams()
  
  // États locaux
  const [isValidating, setIsValidating] = useState(false)
  const [cookieError, setCookieError] = useState(false)
  const [isLoadingDbData, setIsLoadingDbData] = useState(false)
  const [dbUserData, setDbUserData] = useState(null)
  const hasProcessedSync = useRef(false)

  // Vérification immédiate : si on a une session, pas d'erreur de cookies
  useEffect(() => {
    if (session?.user) {
      console.log('✅ [COOKIES] Session active détectée, cookies OK');
      setCookieError(false);
    }
  }, [session?.user]);

  // Vérifier si les cookies sont activés
  useEffect(() => {
    // Vérification améliorée des cookies
    const checkCookies = () => {
      try {
        // Essayer de définir un cookie test
        document.cookie = "cookieTest=1; path=/; SameSite=Lax";
        
        // Attendre un court moment pour que le cookie soit défini
        setTimeout(() => {
          const cookiesEnabled = document.cookie.indexOf("cookieTest=") !== -1;
          
          if (!cookiesEnabled) {
            // Vérification alternative : si on a une session, les cookies fonctionnent
            const hasAuthCookies = document.cookie.includes('authjs.') || document.cookie.includes('next-auth');
            
            if (!hasAuthCookies && !session?.user) {
              console.error('❌ [COOKIES] Les cookies semblent désactivés');
              setCookieError(true);
            } else {
              console.log('✅ [COOKIES] Les cookies sont activés (session détectée)');
              setCookieError(false);
            }
          } else {
            console.log('✅ [COOKIES] Les cookies sont activés');
            setCookieError(false);
            // Nettoyer le cookie test
            document.cookie = "cookieTest=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
          }
        }, 100);
      } catch (error) {
        console.error('❌ [COOKIES] Erreur lors de la vérification des cookies:', error);
        // Si on a une session malgré l'erreur, les cookies fonctionnent
        if (session?.user) {
          setCookieError(false);
        } else {
          setCookieError(true);
        }
      }
    };

    checkCookies();
    
    // Vérifier l'état de la session seulement si nécessaire
    if (session?.user) {
      checkSessionStatus();
    }
  }, [session?.user]);

  // Traiter la synchronisation UNE SEULE FOIS au montage
  useEffect(() => {
    const shouldSync = searchParams.get('sync-validation') === 'true'
    
    if (session?.user && shouldSync && !hasProcessedSync.current && !isValidating) {
      hasProcessedSync.current = true
      
      // Nettoyer l'URL immédiatement pour éviter les redirections en boucle
      if (typeof window !== 'undefined' && window.history) {
        const url = new URL(window.location.href);
        url.searchParams.delete('sync-validation');
        window.history.replaceState({}, '', url.toString());
      }
      
      // Synchroniser le statut de validation
      syncValidationStatus()
    }
  }, [session?.user?.id]) // Seulement l'ID de l'utilisateur comme dépendance
  
  // Fonction pour vérifier l'état de la session (uniquement si besoin)
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
        
        // Si on a une session utilisateur active, les cookies fonctionnent
        if (session?.user) {
          console.log('✅ [COOKIES] Session utilisateur active, cookies OK');
          setCookieError(false);
          return;
        }
        
        // Vérifier si les cookies de session sont présents seulement si pas de session
        const hasSessionCookies = data.cookies?.list?.some(
          cookie => cookie.name?.includes('next-auth.session') || cookie.name?.includes('authjs.')
        );
        
        if (!hasSessionCookies && !session?.user) {
          console.warn('⚠️ [COOKIES] Aucun cookie de session trouvé et pas de session active');
          setCookieError(true);
        } else {
          setCookieError(false);
        }
      }
    } catch (error) {
      console.error('❌ [DEBUG] Erreur vérification session:', error);
      // Si on a une session malgré l'erreur, les cookies fonctionnent
      if (session?.user) {
        setCookieError(false);
      }
    }
  };

  // Fonction pour récupérer les données utilisateur directement depuis la base de données
  const loadUserDataFromDb = async () => {
    if (isLoadingDbData) return;
    
    setIsLoadingDbData(true);
    try {
      console.log('🔄 [DB] Tentative de récupération des données utilisateur depuis la base de données...');
      
      const response = await fetch('/api/auth/user-data', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ [DB] Données utilisateur récupérées avec succès:', data);
        setDbUserData(data.user);
        setCookieError(false); // Réinitialiser l'erreur de cookies si les données sont récupérées
        console.log('✅ [COOKIES] Données utilisateur chargées, cookies fonctionnels');
        
        // Mettre à jour la session si possible
        if (update) {
          await update(data.user);
        }
        
        toast({
          title: "Données récupérées",
          description: "Vos informations ont été chargées depuis la base de données.",
          variant: "default"
        });
      } else {
        console.error('❌ [DB] Échec de récupération des données utilisateur:', await response.json());
        toast({
          title: "Échec de récupération",
          description: "Impossible de charger vos données. Veuillez vous reconnecter.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ [DB] Erreur lors de la récupération des données:', error);
    } finally {
      setIsLoadingDbData(false);
    }
  };

  // Ne synchroniser QUE si explicitement demandé
  const syncValidationStatus = async () => {
    if (isValidating) return
    setIsValidating(true)

    try {
      console.log('🔄 [CLIENT] Tentative de synchronisation du statut de validation...')
      
      // Utiliser la nouvelle API pour forcer la mise à jour complète
      const response = await fetch('/api/auth/refresh-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })
      
      const result = await response.json()
      console.log('📊 [CLIENT] Résultat de la mise à jour de session:', result)

      // Si la mise à jour a réussi et qu'une redirection est nécessaire
      if (result.success && result.needsRedirect) {
        console.log('✅ [CLIENT] Session mise à jour avec succès, redirection vers:', result.redirectUrl)
        
        // Forcer la déconnexion et reconnexion pour recharger complètement la session
        await signOut({ redirect: false })
        
        // Petit délai avant rechargement
        setTimeout(() => {
          window.location.href = '/fr/login?callbackUrl=' + encodeURIComponent(result.redirectUrl)
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
      
      // Supprimer l'appel automatique qui peut causer des boucles
      // await checkSessionStatus();
      
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
          
          <Button 
            onClick={loadUserDataFromDb} 
            className="flex items-center gap-2"
            disabled={isLoadingDbData}
          >
            <Database className="h-4 w-4" /> 
            {isLoadingDbData ? "Chargement..." : "Charger depuis la base de données"}
          </Button>
          
          <Button variant="outline" onClick={() => window.location.href = '/fr/login'}>
            Retour à la connexion
          </Button>
        </div>
      </div>
    );
  }

  if (status === 'loading' || isValidating || isLoadingDbData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isValidating ? 'Synchronisation du statut de validation...' : 
             isLoadingDbData ? 'Chargement depuis la base de données...' : 'Chargement...'}
          </p>
        </div>
      </div>
    )
  }

  // Utiliser les données de la base de données si disponibles, sinon utiliser les données de session
  const effectiveUser = dbUserData || user;

  if (!effectiveUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            {t("auth.required_title")}
          </h2>
          <p className="text-gray-600">{t("auth.required_description")}</p>
          <div className="flex flex-col gap-2 mt-4">
            <Button 
              onClick={loadUserDataFromDb} 
              className="flex items-center gap-2"
            >
              <Database className="h-4 w-4" /> Charger depuis la base de données
            </Button>
            <Button 
              onClick={() => window.location.href = '/fr/login'} 
              className="mt-2"
            >
              Se connecter
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("page.title")} description={t("page.description")} />

      {/* Supprimer l'indicateur de synchronisation automatique */}
      {/* {isSyncing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-blue-800 text-sm">
              Synchronisation des données en cours...
            </span>
          </div>
        </div>
      )} */}

      <DelivererRecruitmentSystem userId={effectiveUser.id} />
    </div>
  );
}
