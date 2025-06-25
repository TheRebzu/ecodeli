"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  ArrowLeft, User, Mail, Phone, MapPin, Calendar, Edit, Trash2, CheckCircle, XCircle
} from "lucide-react"

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

export default function AdminUserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const userId = params.id as string

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      console.log('🔍 Fetching user profile:', userId)
      
      const response = await fetch(`/api/admin/users/${userId}`, {
        credentials: 'include',
      })
      
      console.log('🌐 Profile response status:', response.status)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Utilisateur non trouvé')
          return
        }
        if (response.status === 403) {
          setError('Accès refusé - permissions insuffisantes')
          return
        }
        throw new Error(`Erreur ${response.status}`)
      }
      
      const data = await response.json()
      console.log('📊 Profile data:', data)
      
      if (data.success) {
        setUser(data.user)
      } else {
        setError(data.error || 'Erreur lors du chargement')
      }
    } catch (error) {
      console.error('💥 Erreur profile:', error)
      setError('Erreur de connexion')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (userId) {
      fetchUserProfile()
    }
  }, [userId])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'destructive'
      case 'DELIVERER': return 'default'
      case 'MERCHANT': return 'secondary'
      case 'PROVIDER': return 'outline'
      case 'CLIENT': return 'default'
      default: return 'default'
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

  if (error) {
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
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Erreur</h3>
              <p className="text-gray-600">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header avec actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-gray-600">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push(`/fr/admin/users/${user.id}/edit`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </Button>
          <Button 
            variant="outline" 
            size="sm"
          >
            {user.emailVerified ? (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                Marquer non vérifié
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Marquer vérifié
              </>
            )}
          </Button>
          <Button 
            variant="destructive" 
            size="sm"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informations générales */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informations générales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{user.email}</span>
                    {user.emailVerified ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Rôle</label>
                  <div className="mt-1">
                    <Badge variant={getRoleBadgeVariant(user.role) as any}>
                      {user.role}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Prénom</label>
                  <p className="mt-1">{user.firstName || 'Non renseigné'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Nom</label>
                  <p className="mt-1">{user.lastName || 'Non renseigné'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Téléphone</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{user.phone || 'Non renseigné'}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Statut</label>
                  <div className="mt-1">
                    <Badge variant={user.isActive ? "default" : "secondary"}>
                      {user.isActive ? "Actif" : "Inactif"}
                    </Badge>
                  </div>
                </div>
              </div>
              
              {(user.address || user.city || user.postalCode) && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4" />
                      Adresse
                    </label>
                    <div className="text-sm">
                      {user.address && <p>{user.address}</p>}
                      {(user.postalCode || user.city) && (
                        <p>{user.postalCode} {user.city}</p>
                      )}
                      {user.country && <p>{user.country}</p>}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Dates */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Dates importantes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Inscription</label>
                <p className="mt-1 text-sm">{formatDate(user.createdAt)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Dernière connexion</label>
                <p className="mt-1 text-sm">
                  {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Jamais'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 