"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Users, 
  Search, 
  Filter,
  MoreHorizontal,
  UserCheck,
  UserX,
  Edit,
  Trash2,
  Mail,
  Phone,
  Eye,
  Download,
  Plus
} from "lucide-react"

// Types pour les utilisateurs
interface User {
  id: string
  email: string
  role: 'CLIENT' | 'DELIVERER' | 'MERCHANT' | 'PROVIDER' | 'ADMIN'
  firstName?: string
  lastName?: string
  phone?: string
  emailVerified: boolean
  isActive: boolean
  createdAt: string
  lastLoginAt?: string
}

// API URL de base
const API_BASE = '/api/admin/users'

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)

  // Fonction pour récupérer les utilisateurs depuis l'API
  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (roleFilter !== 'all') params.append('role', roleFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)

      console.log('🔍 Fetching users with params:', params.toString());
      
      const response = await fetch(`${API_BASE}?${params}`, {
        credentials: 'include', // Important pour inclure les cookies
      })
      
      console.log('🌐 Fetch response status:', response.status);
      
      const data = await response.json()
      console.log('📊 Fetch response data:', data);

      if (data.success) {
        setUsers(data.users)
        console.log('✅ Users loaded:', data.users.length);
      } else {
        console.error('❌ Erreur lors de la récupération des utilisateurs:', data.error)
      }
    } catch (error) {
      console.error('💥 Erreur réseau fetchUsers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Récupérer les utilisateurs au chargement initial
  useEffect(() => {
    fetchUsers()
  }, [])

  // Refetch quand les filtres changent
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchUsers()
    }, 500) // Debounce de 500ms pour éviter trop de requêtes

    return () => clearTimeout(debounceTimer)
  }, [searchTerm, roleFilter, statusFilter])

  // Synchroniser les utilisateurs filtrés avec les utilisateurs récupérés
  useEffect(() => {
    setFilteredUsers(users)
  }, [users])

  const handleToggleVerification = async (userId: string, currentEmailVerified: boolean) => {
    try {
      console.log('🔄 Toggle verification:', { userId, currentEmailVerified });
      
      const response = await fetch(API_BASE, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          // Les cookies sont automatiquement inclus pour same-origin
        },
        credentials: 'include', // Important pour inclure les cookies
        body: JSON.stringify({
          userId,
          action: 'toggle_verification',
          data: { currentEmailVerified }
        })
      })

      console.log('🌐 Response status:', response.status);
      
      const data = await response.json()
      console.log('📝 Response data:', data);
      
      if (data.success) {
        // Rafraîchir les données
        console.log('✅ Action réussie, rafraîchissement...');
        fetchUsers()
      } else {
        console.error('❌ Erreur API:', data.error);
        alert('Erreur lors de la mise à jour: ' + data.error)
      }
    } catch (error) {
      console.error('💥 Erreur réseau:', error)
      alert('Erreur réseau lors de la mise à jour: ' + error.message)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) {
      try {
        console.log('🗑️ Delete user:', userId);
        
        const response = await fetch(`${API_BASE}?userId=${userId}`, {
          method: 'DELETE',
          credentials: 'include', // Important pour inclure les cookies
        })

        console.log('🌐 Delete response status:', response.status);
        
        const data = await response.json()
        console.log('📝 Delete response data:', data);
        
        if (data.success) {
          // Rafraîchir les données
          console.log('✅ Suppression réussie, rafraîchissement...');
          fetchUsers()
        } else {
          console.error('❌ Erreur suppression:', data.error);
          alert('Erreur lors de la suppression: ' + data.error)
        }
      } catch (error) {
        console.error('💥 Erreur réseau suppression:', error)
        alert('Erreur réseau lors de la suppression: ' + error.message)
      }
    }
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const stats = {
    total: users.length,
    active: users.filter(u => u.isActive).length,
    verified: users.filter(u => u.emailVerified).length,
    clients: users.filter(u => u.role === 'CLIENT').length,
    deliverers: users.filter(u => u.role === 'DELIVERER').length,
    merchants: users.filter(u => u.role === 'MERCHANT').length,
    providers: users.filter(u => u.role === 'PROVIDER').length,
    admins: users.filter(u => u.role === 'ADMIN').length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="h-8 w-8 text-red-600" />
            Gestion des Utilisateurs
          </h1>
          <p className="text-gray-600 mt-1">
            Administration et modération des comptes utilisateurs
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nouvel utilisateur
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Actifs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.verified}</div>
            <p className="text-xs text-muted-foreground">Vérifiés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.clients}</div>
            <p className="text-xs text-muted-foreground">Clients</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.deliverers}</div>
            <p className="text-xs text-muted-foreground">Livreurs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.merchants}</div>
            <p className="text-xs text-muted-foreground">Commerçants</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.providers}</div>
            <p className="text-xs text-muted-foreground">Prestataires</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.admins}</div>
            <p className="text-xs text-muted-foreground">Admins</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtres et Recherche</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par email, nom ou prénom..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 max-w-sm"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                <SelectItem value="CLIENT">Clients</SelectItem>
                <SelectItem value="DELIVERER">Livreurs</SelectItem>
                <SelectItem value="MERCHANT">Commerçants</SelectItem>
                <SelectItem value="PROVIDER">Prestataires</SelectItem>
                <SelectItem value="ADMIN">Admins</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="active">Actifs</SelectItem>
                <SelectItem value="inactive">Inactifs</SelectItem>
                <SelectItem value="verified">Vérifiés</SelectItem>
                <SelectItem value="unverified">Non vérifiés</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tableau des utilisateurs */}
      <Card>
        <CardHeader>
          <CardTitle>
            Utilisateurs ({filteredUsers.length})
          </CardTitle>
          <CardDescription>
            Liste de tous les utilisateurs avec leurs informations et statuts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Chargement des utilisateurs...</p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Inscription</TableHead>
                  <TableHead>Dernière connexion</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      Aucun utilisateur trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role) as any}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {user.emailVerified ? "✓" : "✗"}
                      </div>
                      {user.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {user.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "default" : "secondary"}>
                      {user.isActive ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {user.lastLoginAt 
                      ? formatDate(user.lastLoginAt)
                      : "Jamais"
                    }
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => router.push(`/fr/admin/users/${user.id}`)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Voir le profil
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => router.push(`/fr/admin/users/${user.id}/edit`)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleToggleVerification(user.id, user.emailVerified)}
                        >
                          {user.emailVerified ? (
                            <>
                              <UserX className="mr-2 h-4 w-4" />
                              Marquer non vérifié
                            </>
                          ) : (
                            <>
                              <UserCheck className="mr-2 h-4 w-4" />
                              Marquer vérifié
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 