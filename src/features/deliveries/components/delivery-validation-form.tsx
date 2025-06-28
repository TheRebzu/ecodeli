"use client"

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { MapPin, Package, CheckCircle, AlertCircle } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

const validationSchema = z.object({
  validationCode: z
    .string()
    .length(6, 'Le code doit contenir exactement 6 chiffres')
    .regex(/^\d{6}$/, 'Le code doit être composé uniquement de chiffres'),
  notes: z.string().optional(),
  useLocation: z.boolean().default(false)
})

type ValidationFormData = z.infer<typeof validationSchema>

interface DeliveryValidationFormProps {
  deliveryId: string
  deliveryInfo?: {
    id: string
    trackingNumber: string
    client: { firstName?: string; lastName?: string }
    announcement: { title: string; deliveryAddress: string }
  }
  onValidationSuccess?: () => void
}

export function DeliveryValidationForm({ 
  deliveryId, 
  deliveryInfo,
  onValidationSuccess 
}: DeliveryValidationFormProps) {
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<{
    success: boolean
    message: string
  } | null>(null)
  const { toast } = useToast()

  const form = useForm<ValidationFormData>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      validationCode: '',
      notes: '',
      useLocation: false
    }
  })

  const getCurrentLocation = (): Promise<{latitude: number, longitude: number}> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Géolocalisation non supportée'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        },
        (error) => {
          reject(new Error('Impossible d\'obtenir la position'))
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    })
  }

  const onSubmit = async (data: ValidationFormData) => {
    setIsValidating(true)
    setValidationResult(null)

    try {
      let locationData = {}
      
      if (data.useLocation) {
        try {
          const position = await getCurrentLocation()
          locationData = {
            latitude: position.latitude,
            longitude: position.longitude
          }
        } catch (error) {
          console.warn('Impossible d\'obtenir la localisation:', error)
        }
      }

      const response = await fetch(`/api/deliveries/${deliveryId}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          validationCode: data.validationCode,
          notes: data.notes,
          ...locationData
        })
      })

      const result = await response.json()

      if (result.success) {
        setValidationResult({
          success: true,
          message: result.message
        })
        
        toast({
          title: "Livraison validée !",
          description: "La livraison a été confirmée avec succès",
        })

        if (onValidationSuccess) {
          onValidationSuccess()
        }
      } else {
        setValidationResult({
          success: false,
          message: result.error || 'Erreur de validation'
        })
        
        toast({
          title: "Erreur de validation",
          description: result.error || 'Code incorrect ou livraison invalide',
          variant: "destructive"
        })
      }
    } catch (error) {
      const errorMessage = 'Erreur de connexion. Vérifiez votre réseau.'
      setValidationResult({
        success: false,
        message: errorMessage
      })
      
      toast({
        title: "Erreur de connexion",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsValidating(false)
    }
  }

  // Si la validation a réussi, afficher le message de succès
  if (validationResult?.success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <div>
              <h3 className="text-xl font-semibold text-green-700">
                Livraison Validée !
              </h3>
              <p className="text-gray-600 mt-2">
                {validationResult.message}
              </p>
            </div>
            <Badge variant="default" className="bg-green-100 text-green-800">
              Livraison terminée
            </Badge>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Valider la Livraison
        </CardTitle>
        {deliveryInfo && (
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Client:</strong> {deliveryInfo.client.firstName} {deliveryInfo.client.lastName}</p>
            <p><strong>Suivi:</strong> {deliveryInfo.trackingNumber}</p>
            <p className="flex items-start gap-1">
              <MapPin className="w-3 h-3 mt-1 flex-shrink-0" />
              {deliveryInfo.announcement.deliveryAddress}
            </p>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Code de validation */}
            <FormField
              control={form.control}
              name="validationCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code de validation (6 chiffres)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="123456"
                      maxLength={6}
                      className="text-center text-2xl font-mono tracking-wider"
                      onChange={(e) => {
                        // Ne permettre que les chiffres
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                        field.onChange(value)
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes optionnelles */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optionnel)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Remarques sur la livraison..."
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Localisation */}
            <FormField
              control={form.control}
              name="useLocation"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4"
                    />
                  </FormControl>
                  <FormLabel className="text-sm">
                    Enregistrer ma position actuelle
                  </FormLabel>
                </FormItem>
              )}
            />

            {/* Message d'erreur */}
            {validationResult && !validationResult.success && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span className="text-sm text-red-700">
                  {validationResult.message}
                </span>
              </div>
            )}

            {/* Bouton de validation */}
            <Button
              type="submit"
              disabled={isValidating || !form.watch('validationCode')}
              className="w-full"
            >
              {isValidating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Validation en cours...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Valider la livraison
                </>
              )}
            </Button>
          </form>
        </Form>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">Instructions:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Demandez le code de validation au client</li>
            <li>• Le code contient exactement 6 chiffres</li>
            <li>• En cas de problème, contactez le support</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}