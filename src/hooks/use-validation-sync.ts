'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'

export function useValidationSync() {
  const { data: session, update } = useSession()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const lastSyncRef = useRef<number>(0)
  const isProcessingRef = useRef(false)

  // Fonction pour déterminer si une vérification est nécessaire
  const shouldCheckValidation = useCallback(() => {
    if (!session?.user) return false

    // Vérifier seulement s'il y a un paramètre URL explicite ou si c'est la première connexion
    const needsSync = searchParams.get('sync-validation') === 'true' || 
                     searchParams.get('check-validation') === 'true'
    
    return needsSync
  }, [session?.user, searchParams])

  const syncValidation = useCallback(async () => {
    // Éviter les appels multiples simultanés
    if (isProcessingRef.current) {
      console.log('🔄 [VALIDATION SYNC] Synchronisation déjà en cours...')
      return false
    }

    // Éviter les synchronisations trop fréquentes (minimum 30 secondes)
    const now = Date.now()
    if (now - lastSyncRef.current < 30000) {
      console.log('⏳ [VALIDATION SYNC] Sync récente, attente...')
      return false
    }

    setIsLoading(true)
    isProcessingRef.current = true
    lastSyncRef.current = now

    try {
      console.log('🔄 [VALIDATION SYNC] Début synchronisation...')
      
      const response = await fetch('/api/auth/sync-validation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ [VALIDATION SYNC] Synchronisation réussie')
        
        // Forcer une mise à jour de la session SEULEMENT si nécessaire
        if (result.needsRefresh) {
          await update()
        }
        
        // Nettoyer les paramètres d'URL si nécessaire
        const urlNeedsSync = searchParams.get('sync-validation') === 'true' || 
                            searchParams.get('check-validation') === 'true'
        
        if (urlNeedsSync) {
          const url = new URL(window.location.href)
          url.searchParams.delete('sync-validation')
          url.searchParams.delete('check-validation')
          window.history.replaceState({}, '', url.toString())
        }
        
        return true
      } else {
        console.error('❌ [VALIDATION SYNC] Erreur de synchronisation')
        return false
      }
    } catch (error) {
      console.error('❌ [VALIDATION SYNC] Erreur:', error)
      return false
    } finally {
      setIsLoading(false)
      isProcessingRef.current = false
    }
  }, [searchParams, update])

  useEffect(() => {
    // Ne synchroniser que si l'utilisateur est connecté et que c'est nécessaire
    if (!session?.user?.id) return
    
    // Vérifier seulement sur demande explicite via URL
    if (shouldCheckValidation()) {
      console.log('🔄 [VALIDATION SYNC] Synchronisation demandée par URL')
      syncValidation()
    }
  }, [session?.user?.id, shouldCheckValidation]) // SEULEMENT ces dépendances

  return {
    isLoading,
    syncValidation
  }
} 