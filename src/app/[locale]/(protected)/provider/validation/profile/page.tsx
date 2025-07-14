'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/auth-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Building, 
  Phone, 
  MapPin, 
  Save, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  ArrowLeft
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/page-header'

interface ProviderProfileForm {
  businessName: string
  siret: string
  description: string
  phone: string
  street: string
  city: string
  postalCode: string
  country: string
}

export default function ProviderValidationProfilePage() {
  const t = useTranslations('provider.validation')
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<ProviderProfileForm>({
    businessName: '',
    siret: '',
    description: '',
    phone: '',
    street: '',
    city: '',
    postalCode: '',
    country: 'France'
  })

  // Charger les données du profil existant
  useEffect(() => {
    if (user?.id) {
      loadProfile()
    }
  }, [user?.id])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/provider/validation/profile?providerId=${user?.id}`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.profile) {
          setProfile({
            businessName: data.profile.businessName || '',
            siret: data.profile.siret || '',
            description: data.profile.description || '',
            phone: data.profile.phone || '',
            street: data.profile.address?.street || '',
            city: data.profile.address?.city || '',
            postalCode: data.profile.address?.postalCode || '',
            country: data.profile.address?.country || 'France'
          })
        }
      }
    } catch (error) {
      console.error('Erreur chargement profil:', error)
      toast.error('Erreur lors du chargement du profil')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      const response = await fetch('/api/provider/validation/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          providerId: user?.id,
          ...profile
        })
      })

      if (response.ok) {
        toast.success('Profil mis à jour avec succès!')
        // Rediriger vers la page de validation des documents
        setTimeout(() => {
          window.location.href = '/fr/provider/validation/documents'
        }, 1500)
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Erreur lors de la sauvegarde')
      }
    } catch (error) {
      console.error('Erreur sauvegarde:', error)
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const isFormValid = () => {
    return (
      profile.businessName.length >= 2 &&
      profile.siret.length === 14 &&
      profile.description.length >= 50 &&
      profile.phone.length >= 10 &&
      profile.street.length >= 5 &&
      profile.city.length >= 2 &&
      profile.postalCode.length === 5
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement du profil...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compléter le profil prestataire"
        description="Ajoutez les informations requises pour finaliser votre validation"
      />

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Pour finaliser votre validation, vous devez compléter toutes les informations ci-dessous.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informations de l'entreprise */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Informations de l'entreprise
            </CardTitle>
            <CardDescription>
              Renseignez les informations de votre activité
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="businessName">
                Nom de l'entreprise *
                {profile.businessName.length > 0 && profile.businessName.length < 2 && (
                  <Badge variant="destructive" className="ml-2">Minimum 2 caractères</Badge>
                )}
              </Label>
              <Input
                id="businessName"
                value={profile.businessName}
                onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                placeholder="Votre raison sociale"
              />
            </div>

            <div>
              <Label htmlFor="siret">
                SIRET *
                {profile.siret.length > 0 && profile.siret.length !== 14 && (
                  <Badge variant="destructive" className="ml-2">14 chiffres requis</Badge>
                )}
              </Label>
              <Input
                id="siret"
                value={profile.siret}
                onChange={(e) => setProfile({ ...profile, siret: e.target.value.replace(/\D/g, '') })}
                placeholder="12345678900012"
                maxLength={14}
              />
            </div>

            <div>
              <Label htmlFor="description">
                Description de l'activité *
                {profile.description.length > 0 && profile.description.length < 50 && (
                  <Badge variant="destructive" className="ml-2">Minimum 50 caractères</Badge>
                )}
              </Label>
              <Textarea
                id="description"
                value={profile.description}
                onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                placeholder="Décrivez votre activité et vos services..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Informations de contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Informations de contact
            </CardTitle>
            <CardDescription>
              Vos coordonnées professionnelles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="phone">
                Téléphone professionnel *
                {profile.phone.length > 0 && profile.phone.length < 10 && (
                  <Badge variant="destructive" className="ml-2">Minimum 10 caractères</Badge>
                )}
              </Label>
              <Input
                id="phone"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="01 23 45 67 89"
              />
            </div>

            <div>
              <Label htmlFor="street">
                Adresse *
                {profile.street.length > 0 && profile.street.length < 5 && (
                  <Badge variant="destructive" className="ml-2">Minimum 5 caractères</Badge>
                )}
              </Label>
              <Input
                id="street"
                value={profile.street}
                onChange={(e) => setProfile({ ...profile, street: e.target.value })}
                placeholder="123 rue de la République"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">
                  Ville *
                  {profile.city.length > 0 && profile.city.length < 2 && (
                    <Badge variant="destructive" className="ml-2">Minimum 2 caractères</Badge>
                  )}
                </Label>
                <Input
                  id="city"
                  value={profile.city}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                  placeholder="Paris"
                />
              </div>

              <div>
                <Label htmlFor="postalCode">
                  Code postal *
                  {profile.postalCode.length > 0 && profile.postalCode.length !== 5 && (
                    <Badge variant="destructive" className="ml-2">5 chiffres requis</Badge>
                  )}
                </Label>
                <Input
                  id="postalCode"
                  value={profile.postalCode}
                  onChange={(e) => setProfile({ ...profile, postalCode: e.target.value.replace(/\D/g, '') })}
                  placeholder="75001"
                  maxLength={5}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="country">Pays</Label>
              <Input
                id="country"
                value={profile.country}
                onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                placeholder="France"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/fr/provider/validation/documents'}
          >
            Voir les documents
          </Button>
          
          <Button 
            onClick={handleSave}
            disabled={!isFormValid() || saving}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder et continuer
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Validation status */}
      {isFormValid() && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Toutes les informations sont complètes. Vous pouvez maintenant sauvegarder.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
