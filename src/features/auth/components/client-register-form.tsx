"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { clientRegisterSchema, type ClientRegisterData } from "@/features/auth/schemas/auth.schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Eye, EyeOff, MapPin, Phone, Mail, User } from "lucide-react"

export function ClientRegisterForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<ClientRegisterData>({
    resolver: zodResolver(clientRegisterSchema),
    defaultValues: {
      subscriptionPlan: 'FREE',
      acceptsMarketing: false,
      acceptsEmailNotifications: true,
      acceptsPushNotifications: true,
      acceptsSmsNotifications: false,
      country: 'FR',
      language: 'fr'
    }
  })
  
  const subscriptionPlan = watch('subscriptionPlan')
  const acceptsTerms = watch('acceptsTerms')

  const onSubmit = async (data: ClientRegisterData) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/register/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Une erreur est survenue')
        return
      }

      // Redirection selon la réponse
      if (result.redirectTo) {
        router.push(result.redirectTo)
      } else {
        // Par défaut, rediriger vers le tutoriel client
        router.push('/client/tutorial')
      }
      
      // Rafraîchir pour mettre à jour l'état d'authentification
      router.refresh()
    } catch (err) {
      setError('Une erreur est survenue lors de l\'inscription')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Rejoignez EcoDeli
        </CardTitle>
        <CardDescription className="text-center">
          Créez votre compte client et commencez à utiliser nos services de livraison écologique
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Informations personnelles */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              Informations personnelles
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom *</Label>
                <Input
                  {...register("firstName")}
                  id="firstName"
                  placeholder="Votre prénom"
                  disabled={isLoading}
                />
                {errors.firstName && (
                  <p className="text-sm text-red-500">{errors.firstName.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom *</Label>
                <Input
                  {...register("lastName")}
                  id="lastName"
                  placeholder="Votre nom"
                  disabled={isLoading}
                />
                {errors.lastName && (
                  <p className="text-sm text-red-500">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email *
                </Label>
                <Input
                  {...register("email")}
                  type="email"
                  id="email"
                  placeholder="votre@email.com"
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Téléphone
                </Label>
                <Input
                  {...register("phone")}
                  type="tel"
                  id="phone"
                  placeholder="06 12 34 56 78"
                  disabled={isLoading}
                />
                {errors.phone && (
                  <p className="text-sm text-red-500">{errors.phone.message}</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Adresse */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Adresse de livraison
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="address">Adresse *</Label>
              <Input
                {...register("address")}
                id="address"
                placeholder="123 Rue de la République"
                disabled={isLoading}
              />
              {errors.address && (
                <p className="text-sm text-red-500">{errors.address.message}</p>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Ville *</Label>
                <Input
                  {...register("city")}
                  id="city"
                  placeholder="Paris"
                  disabled={isLoading}
                />
                {errors.city && (
                  <p className="text-sm text-red-500">{errors.city.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="postalCode">Code postal *</Label>
                <Input
                  {...register("postalCode")}
                  id="postalCode"
                  placeholder="75001"
                  disabled={isLoading}
                />
                {errors.postalCode && (
                  <p className="text-sm text-red-500">{errors.postalCode.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="country">Pays</Label>
                <Select onValueChange={(value) => setValue('country', value)} defaultValue="FR">
                  <SelectTrigger>
                    <SelectValue placeholder="Pays" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FR">France</SelectItem>
                    <SelectItem value="BE">Belgique</SelectItem>
                    <SelectItem value="CH">Suisse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Sécurité */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Sécurité</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe *</Label>
                <div className="relative">
                  <Input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    id="password"
                    placeholder="Mot de passe sécurisé"
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
                <div className="relative">
                  <Input
                    {...register("confirmPassword")}
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    placeholder="Confirmer le mot de passe"
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Abonnement */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Plan d'abonnement</h3>
            
            <div className="space-y-2">
              <Label htmlFor="subscriptionPlan">Choisissez votre plan</Label>
              <Select onValueChange={(value) => setValue('subscriptionPlan', value as any)} defaultValue="FREE">
                <SelectTrigger>
                  <SelectValue placeholder="Plan d'abonnement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE">
                    <div className="flex flex-col">
                      <span className="font-medium">Gratuit - 0€/mois</span>
                      <span className="text-sm text-gray-500">Assurance limitée, pas de réduction</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="STARTER">
                    <div className="flex flex-col">
                      <span className="font-medium">Starter - 9.90€/mois</span>
                      <span className="text-sm text-gray-500">Assurance 115€/envoi, 5% de réduction</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="PREMIUM">
                    <div className="flex flex-col">
                      <span className="font-medium">Premium - 19.99€/mois</span>
                      <span className="text-sm text-gray-500">Assurance 3000€/envoi, 9% de réduction</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.subscriptionPlan && (
                <p className="text-sm text-red-500">{errors.subscriptionPlan.message}</p>
              )}
            </div>
          </div>
          
          {/* Préférences */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Préférences de communication</h3>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  {...register("acceptsEmailNotifications")}
                  id="acceptsEmailNotifications"
                  defaultChecked={true}
                />
                <Label htmlFor="acceptsEmailNotifications" className="text-sm">
                  Recevoir les notifications par email
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  {...register("acceptsPushNotifications")}
                  id="acceptsPushNotifications"
                  defaultChecked={true}
                />
                <Label htmlFor="acceptsPushNotifications" className="text-sm">
                  Recevoir les notifications push
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  {...register("acceptsMarketing")}
                  id="acceptsMarketing"
                />
                <Label htmlFor="acceptsMarketing" className="text-sm">
                  Recevoir les actualités et offres promotionnelles
                </Label>
              </div>
            </div>
          </div>

          {/* Conditions */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                {...register("acceptsTerms")}
                id="acceptsTerms"
                required
              />
              <Label htmlFor="acceptsTerms" className="text-sm">
                J'accepte les{' '}
                <Button variant="link" className="p-0 h-auto text-sm underline" type="button">
                  Conditions d'utilisation
                </Button>
                {' '}et la{' '}
                <Button variant="link" className="p-0 h-auto text-sm underline" type="button">
                  Politique de confidentialité
                </Button>
              </Label>
            </div>
            {errors.acceptsTerms && (
              <p className="text-sm text-red-500">{errors.acceptsTerms.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading || !acceptsTerms}
            className="w-full bg-green-600 hover:bg-green-700 h-12"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Création en cours...' : 'Créer mon compte client'}
          </Button>
          
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Déjà un compte ?{' '}
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto font-normal"
                onClick={() => router.push('/login')}
              >
                Se connecter
              </Button>
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}