"use client";

import { useEffect, useState } from 'react'
import { useSession, signOut, signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from "@/hooks/use-auth";
import { useValidationSync } from "@/hooks/use-validation-sync";
import DelivererRecruitmentSystem from "@/features/deliverer/components/recruitment/deliverer-recruitment-system";
import { PageHeader } from "@/components/layout/page-header";
import { useTranslations } from "next-intl";

export default function DelivererRecruitmentPage() {
  const { data: session, status, update } = useSession()
  const [isValidating, setIsValidating] = useState(false)
  const searchParams = useSearchParams()
  const shouldSync = searchParams.get('sync-validation') === 'true'

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
        headers: { 'Content-Type': 'application/json' }
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

  const { user } = useAuth();
  const { isLoading: isSyncing } = useValidationSync();
  const t = useTranslations("deliverer.recruitment");

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            {t("auth.required_title")}
          </h2>
          <p className="text-gray-600">{t("auth.required_description")}</p>
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
