"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Copy, Clock, Shield } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface ValidationCodeDisplayProps {
  deliveryId: string
  onCodeGenerated?: (code: string) => void
}

interface ValidationCodeData {
  code: string
  expiresAt: string
  timeRemaining: number
}

export function ValidationCodeDisplay({ deliveryId, onCodeGenerated }: ValidationCodeDisplayProps) {
  const [validationData, setValidationData] = useState<ValidationCodeData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState<string>('')
  const { toast } = useToast()

  // Mettre à jour le temps restant
  useEffect(() => {
    if (!validationData) return

    const interval = setInterval(() => {
      const remaining = Math.max(0, new Date(validationData.expiresAt).getTime() - Date.now())
      
      if (remaining <= 0) {
        setTimeLeft('Expiré')
        clearInterval(interval)
        return
      }

      const minutes = Math.floor(remaining / (1000 * 60))
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000)
      setTimeLeft(`${minutes}m ${seconds}s`)
    }, 1000)

    return () => clearInterval(interval)
  }, [validationData])

  // Charger le code existant
  useEffect(() => {
    fetchValidationCode()
  }, [deliveryId])

  const fetchValidationCode = async () => {
    try {
      const response = await fetch(`/api/deliveries/${deliveryId}/validation-code`)
      if (response.ok) {
        const data = await response.json()
        setValidationData(data.data)
      }
    } catch (error) {
      console.error('Erreur récupération code:', error)
    }
  }

  const generateNewCode = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/deliveries/${deliveryId}/validation-code`, {
        method: 'POST'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur génération code')
      }

      const data = await response.json()
      setValidationData(data.data)
      
      if (onCodeGenerated) {
        onCodeGenerated(data.data.code)
      }

      toast({
        title: "Code généré",
        description: "Nouveau code de validation créé avec succès",
      })
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de générer le code",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (validationData?.code) {
      navigator.clipboard.writeText(validationData.code)
      toast({
        title: "Code copié",
        description: "Le code de validation a été copié dans le presse-papiers",
      })
    }
  }

  const isExpired = validationData && new Date(validationData.expiresAt) <= new Date()

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center pb-3">
        <CardTitle className="flex items-center justify-center gap-2">
          <Shield className="w-5 h-5" />
          Code de Validation
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {validationData ? (
          <>
            {/* Code de validation */}
            <div className="text-center">
              <div className="bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-200">
                <div className="text-4xl font-mono font-bold tracking-wider mb-2">
                  {validationData.code}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyToClipboard}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copier le code
                </Button>
              </div>
            </div>

            {/* Statut et temps restant */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm text-gray-600">Temps restant:</span>
              </div>
              <Badge variant={isExpired ? "destructive" : "secondary"}>
                {timeLeft || 'Calcul...'}
              </Badge>
            </div>

            {/* Bouton renouveler */}
            {isExpired && (
              <Button
                onClick={generateNewCode}
                disabled={isLoading}
                className="w-full"
                variant="outline"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Générer un nouveau code
              </Button>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Instructions:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Donnez ce code au livreur à la réception</li>
                <li>• Le code expire dans 2 heures</li>
                <li>• Un nouveau code sera généré si nécessaire</li>
              </ul>
            </div>
          </>
        ) : (
          <>
            {/* Pas de code */}
            <div className="text-center text-gray-500 py-6">
              <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="mb-4">Aucun code de validation actif</p>
              <Button
                onClick={generateNewCode}
                disabled={isLoading}
                className="w-full"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Générer un code de validation
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}