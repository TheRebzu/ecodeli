"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Save, X } from "lucide-react"

// Schema de validation pour l'édition utilisateur
const editUserSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  role: z.enum(['CLIENT', 'DELIVERER', 'MERCHANT', 'PROVIDER', 'ADMIN']),
  emailVerified: z.boolean(),
  isActive: z.boolean()
})

type EditUserForm = z.infer<typeof editUserSchema>

interface UserProfile {
  id: string
  email: string
  role: 'CLIENT' | 'DELIVERER' | 'MERCHANT' | 'PROVIDER' | 'ADMIN'
  firstName?: string
  lastName?: string
  phone?: string
  address?: string
  city?: string
  postalCode?: string
  country?: string
  emailVerified: boolean
  isActive: boolean
  createdAt: string
  lastLoginAt?: string
}

export default function AdminUserEditPage() {
  const params = useParams()
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const userId = params.id as string

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty }
  } = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema)
  })

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true)
      
      const response = await fetch(`/api/admin/users/${userId}`, {
        credentials: 'include',
      })
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        const user = data.user
        setUser(user)
        
        // Pré-remplir le formulaire avec les données réelles
        setValue('firstName', user.firstName || '')
        setValue('lastName', user.lastName || '')
        setValue('email', user.email)
        setValue('phone', user.phone || '')
        setValue('address', user.address || '')
        setValue('city', user.city || '')
        setValue('postalCode', user.postalCode || '')
        setValue('country', user.country || '')
        setValue('role', user.role)
        setValue('emailVerified', user.emailVerified)
        setValue('isActive', user.isActive)
      } else {
        throw new Error(data.error || 'Erreur lors du chargement')
      }
    } catch (error) {
      console.error('💥 Erreur profile:', error)
      alert('❌ Erreur lors du chargement du profil')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (userId) {
      fetchUserProfile()
    }
  }, [userId, setValue])

  const onSubmit = async (data: EditUserForm) => {
    try {
      setIsSaving(true)
      
      console.log('💾 Saving user data:', data)
      
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        alert('✅ Les informations ont été mises à jour avec succès !')
        router.push(`/fr/admin/users/${userId}`)
      } else {
        throw new Error(result.error || 'Erreur lors de la sauvegarde')
      }
      
    } catch (error) {
      console.error('💥 Erreur sauvegarde:', error)
      alert('❌ Erreur lors de la sauvegarde: ' + (error as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Chargement du profil...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Utilisateur non trouvé</h3>
              <p className="text-gray-600">Cet utilisateur n'existe pas ou a été supprimé.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Modifier {user.firstName} {user.lastName}
            </h1>
            <p className="text-gray-600">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => router.push(`/fr/admin/users/${userId}`)}
          >
            <X className="h-4 w-4 mr-2" />
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit(onSubmit)}
            disabled={!isDirty || isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Informations personnelles */}
          <Card>
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Prénom *</Label>
                  <Input
                    id="firstName"
                    {...register('firstName')}
                    className={errors.firstName ? 'border-red-500' : ''}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-red-500 mt-1">{errors.firstName.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lastName">Nom *</Label>
                  <Input
                    id="lastName"
                    {...register('lastName')}
                    className={errors.lastName ? 'border-red-500' : ''}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-red-500 mt-1">{errors.lastName.message}</p>
                  )}
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="+33123456789"
                />
              </div>
            </CardContent>
          </Card>

          {/* Adresse */}
          <Card>
            <CardHeader>
              <CardTitle>Adresse</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  {...register('address')}
                  placeholder="123 rue de la Paix"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="postalCode">Code postal</Label>
                  <Input
                    id="postalCode"
                    {...register('postalCode')}
                    placeholder="75001"
                  />
                </div>
                <div>
                  <Label htmlFor="city">Ville</Label>
                  <Input
                    id="city"
                    {...register('city')}
                    placeholder="Paris"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="country">Pays</Label>
                <Input
                  id="country"
                  {...register('country')}
                  placeholder="France"
                />
              </div>
            </CardContent>
          </Card>

          {/* Paramètres du compte */}
          <Card>
            <CardHeader>
              <CardTitle>Paramètres du compte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="role">Rôle</Label>
                <Select
                  value={watch('role')}
                  onValueChange={(value) => setValue('role', value as any, { shouldDirty: true })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLIENT">Client</SelectItem>
                    <SelectItem value="DELIVERER">Livreur</SelectItem>
                    <SelectItem value="MERCHANT">Commerçant</SelectItem>
                    <SelectItem value="PROVIDER">Prestataire</SelectItem>
                    <SelectItem value="ADMIN">Administrateur</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="emailVerified">Email vérifié</Label>
                  <p className="text-sm text-gray-500">L'utilisateur a confirmé son email</p>
                </div>
                <Switch
                  id="emailVerified"
                  checked={watch('emailVerified')}
                  onCheckedChange={(checked) => setValue('emailVerified', checked, { shouldDirty: true })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isActive">Compte actif</Label>
                  <p className="text-sm text-gray-500">L'utilisateur peut se connecter</p>
                </div>
                <Switch
                  id="isActive"
                  checked={watch('isActive')}
                  onCheckedChange={(checked) => setValue('isActive', checked, { shouldDirty: true })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Informations en lecture seule */}
          <Card>
            <CardHeader>
              <CardTitle>Informations système</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>ID utilisateur</Label>
                <p className="text-sm text-gray-600 font-mono">{user.id}</p>
              </div>
              
              <div>
                <Label>Date d'inscription</Label>
                <p className="text-sm text-gray-600">
                  {new Date(user.createdAt).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              <div>
                <Label>Dernière connexion</Label>
                <p className="text-sm text-gray-600">
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'Jamais'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
} 