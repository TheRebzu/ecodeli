'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Route } from 'lucide-react'
import { CreateRouteForm } from '@/features/deliverer/components/routes/create-route-form'

interface CreateRoutePageProps {
  params: {
    locale: string
  }
}

export default function CreateRoutePage({ params }: CreateRoutePageProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSuccess = () => {
    // Rediriger vers la liste des routes après création
    router.push(`/${params.locale}/deliverer/routes`)
  }

  const handleCancel = () => {
    router.back()
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>
        
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Route className="h-8 w-8" />
            Créer une nouvelle route
          </h1>
          <p className="text-muted-foreground">
            Définissez votre itinéraire de livraison pour optimiser vos déplacements
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration de la route</CardTitle>
          <CardDescription>
            Remplissez les informations ci-dessous pour créer votre route de livraison.
            Vous pourrez ensuite la modifier ou la supprimer depuis votre tableau de bord.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateRouteForm onSuccess={handleSuccess} />
        </CardContent>
      </Card>

      {/* Help section */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">💡 Conseils pour optimiser votre route</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-blue-700">
          <p>• <strong>Nom descriptif :</strong> Utilisez un nom qui vous aide à identifier rapidement la route</p>
          <p>• <strong>Horaires réalistes :</strong> Prévoyez du temps pour les imprévus et les arrêts</p>
          <p>• <strong>Capacité adaptée :</strong> Choisissez une capacité qui correspond à votre véhicule</p>
          <p>• <strong>Récurrence :</strong> Activez la récurrence pour les trajets réguliers</p>
          <p>• <strong>Prix au km :</strong> Définissez un tarif compétitif pour attirer les clients</p>
        </CardContent>
      </Card>
    </div>
  )
} 