'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'

export function useValidationSync() {
  const { data: session, update } = useSession()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [lastSyncCheck, setLastSyncCheck] = useState<string | null>(null)

  useEffect(() => {
    async function syncValidation() {
      // Ne synchroniser que si l'utilisateur est connecté
      if (!session?.user?.id) return

      // Vérifier les paramètres URL qui indiquent un besoin de sync
      const needsSync = searchParams.get('sync-validation') === 'true' || 
                       searchParams.get('check-validation') === 'true'

      // Éviter les synchronisations multiples rapprochées
      const now = Date.now().toString()
      if (lastSyncCheck && (parseInt(now) - parseInt(lastSyncCheck)) < 30000) {
        console.log('⏳ [VALIDATION SYNC] Sync récente, attente...')
        return
      }

      // Synchroniser si nécessaire ou si demandé par l'URL
      if (needsSync || shouldCheckValidation()) {
        setIsLoading(true)
        setLastSyncCheck(now)

        try {
          console.log('🔄 [VALIDATION SYNC] Début synchronisation...')
          
          const response = await fetch('/api/auth/sync-validation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          })

          if (response.ok) {
            console.log('✅ [VALIDATION SYNC] Synchronisation réussie')
            
            // Forcer une mise à jour de la session
            await update()
            
            // Recharger la page pour appliquer les changements
            if (needsSync) {
              // Supprimer les paramètres de sync de l'URL
              const url = new URL(window.location.href)
              url.searchParams.delete('sync-validation')
              url.searchParams.delete('check-validation')
              
              // Rediriger vers l'URL nettoyée
              window.history.replaceState({}, '', url.toString())
              
              // Attendre un peu puis recharger
              setTimeout(() => {
                window.location.reload()
              }, 1000)
            }
          } else {
            console.error('❌ [VALIDATION SYNC] Erreur de synchronisation')
          }
        } catch (error) {
          console.error('❌ [VALIDATION SYNC] Erreur:', error)
        } finally {
          setIsLoading(false)
        }
      }
    }

    // Fonction pour déterminer si une vérification est nécessaire
    function shouldCheckValidation(): boolean {
      if (!session?.user) return false

      // Pour les livreurs et prestataires, vérifier s'il y a une incohérence
      if (session.user.role === 'DELIVERER' || session.user.role === 'PROVIDER') {
        // Si le statut de validation semble incorrect, synchroniser
        return session.user.validationStatus === 'PENDING' && session.user.isActive
      }

      return false
    }

    syncValidation()
  }, [session, searchParams, lastSyncCheck, update])

  return {
    isLoading,
    syncValidation: async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/auth/sync-validation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        if (response.ok) {
          await update()
          return true
        }
        return false
      } catch (error) {
        console.error('Erreur de synchronisation:', error)
        return false
      } finally {
        setIsLoading(false)
      }
    }
  }
} 