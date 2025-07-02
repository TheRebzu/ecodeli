'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Search, 
  Clock, 
  CheckCircle, 
  XCircle,
  User,
  FileText,
  Users,
  AlertTriangle,
  RefreshCw
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface UserWithVerification {
  id: string
  email: string
  role: string
  firstName: string | null
  lastName: string | null
  emailVerified: boolean
  documentsCount: number
  pendingDocuments: number
  approvedDocuments: number
  rejectedDocuments: number
  lastDocumentSubmitted: string | null
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'INCOMPLETE'
  createdAt: string
}

interface VerificationStats {
  total: number
  pending: number
  approved: number
  rejected: number
  incomplete: number
  byRole: {
    DELIVERER: number
    PROVIDER: number
    MERCHANT: number
  }
}

interface UserVerificationsDashboardProps {
  defaultStatus?: string
  defaultRole?: string
}

export function UserVerificationsDashboard({ 
  defaultStatus = 'all',
  defaultRole = 'all'
}: UserVerificationsDashboardProps = {}) {
  const [users, setUsers] = useState<UserWithVerification[]>([])
  const [stats, setStats] = useState<VerificationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>(defaultRole)
  const [selectedStatus, setSelectedStatus] = useState<string>(defaultStatus)

  const fetchData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        search,
        role: selectedRole,
        status: selectedStatus
      })

      const [usersResponse, statsResponse] = await Promise.all([
        fetch(`/api/admin/verifications/users?${params}`),
        fetch('/api/admin/verifications/stats')
      ])

      if (usersResponse.ok && statsResponse.ok) {
        const usersData = await usersResponse.json()
        const statsData = await statsResponse.json()
        
        setUsers(usersData.users || [])
        setStats(statsData.stats || null)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedRole, selectedStatus])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchData()
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [search])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="text-yellow-600"><Clock className="w-3 h-3 mr-1" />En attente</Badge>
      case 'APPROVED':
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Approuvé</Badge>
      case 'REJECTED':
        return <Badge variant="outline" className="text-red-600"><XCircle className="w-3 h-3 mr-1" />Rejeté</Badge>
      case 'INCOMPLETE':
        return <Badge variant="outline" className="text-orange-600"><AlertTriangle className="w-3 h-3 mr-1" />Incomplet</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getRoleBadge = (role: string) => {
    const colors = {
      DELIVERER: 'bg-blue-100 text-blue-800',
      PROVIDER: 'bg-purple-100 text-purple-800',
      MERCHANT: 'bg-green-100 text-green-800'
    }
    
    const labels = {
      DELIVERER: 'Livreur',
      PROVIDER: 'Prestataire',
      MERCHANT: 'Commerçant'
    }

    return (
      <Badge className={colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {labels[role as keyof typeof labels] || role}
      </Badge>
    )
  }

  const filteredUsers = users.filter(user => {
    if (selectedRole !== 'all' && user.role !== selectedRole) return false
    if (selectedStatus !== 'all' && user.verificationStatus !== selectedStatus) return false
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistiques globales */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En attente</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approuvés</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejetés</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Incomplets</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.incomplete}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtres et recherche */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par email ou nom..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-[300px]"
              />
            </div>
            <Button onClick={fetchData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Onglets par statut */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres par statut</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">Tous</TabsTrigger>
              <TabsTrigger value="PENDING">
                En attente ({stats?.pending || 0})
              </TabsTrigger>
              <TabsTrigger value="APPROVED">
                Approuvés ({stats?.approved || 0})
              </TabsTrigger>
              <TabsTrigger value="REJECTED">
                Rejetés ({stats?.rejected || 0})
              </TabsTrigger>
              <TabsTrigger value="INCOMPLETE">
                Incomplets ({stats?.incomplete || 0})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Onglets par rôle */}
      <Tabs value={selectedRole} onValueChange={setSelectedRole}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">Tous ({users.length})</TabsTrigger>
          <TabsTrigger value="DELIVERER">
            Livreurs ({stats?.byRole.DELIVERER || 0})
          </TabsTrigger>
          <TabsTrigger value="PROVIDER">
            Prestataires ({stats?.byRole.PROVIDER || 0})
          </TabsTrigger>
          <TabsTrigger value="MERCHANT">
            Commerçants ({stats?.byRole.MERCHANT || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <UserVerificationsTable 
            users={filteredUsers} 
            getStatusBadge={getStatusBadge}
            getRoleBadge={getRoleBadge}
          />
        </TabsContent>

        <TabsContent value="DELIVERER" className="space-y-4">
          <UserVerificationsTable 
            users={filteredUsers} 
            getStatusBadge={getStatusBadge}
            getRoleBadge={getRoleBadge}
          />
        </TabsContent>

        <TabsContent value="PROVIDER" className="space-y-4">
          <UserVerificationsTable 
            users={filteredUsers} 
            getStatusBadge={getStatusBadge}
            getRoleBadge={getRoleBadge}
          />
        </TabsContent>

        <TabsContent value="MERCHANT" className="space-y-4">
          <UserVerificationsTable 
            users={filteredUsers} 
            getStatusBadge={getStatusBadge}
            getRoleBadge={getRoleBadge}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface UserVerificationsTableProps {
  users: UserWithVerification[]
  getStatusBadge: (status: string) => React.ReactNode
  getRoleBadge: (role: string) => React.ReactNode
}

function UserVerificationsTable({ users, getStatusBadge, getRoleBadge }: UserVerificationsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Utilisateurs avec documents ({users.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Documents</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Dernière soumission</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <div className="font-medium">
                      {user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}`
                        : user.email
                      }
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {user.email}
                    </div>
                    {!user.emailVerified && (
                      <Badge variant="outline" className="text-xs w-fit mt-1 text-orange-600">
                        Email non vérifié
                      </Badge>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  {getRoleBadge(user.role)}
                </TableCell>

                <TableCell>
                  <div className="flex flex-col space-y-1">
                    <div className="text-sm">
                      Total: {user.documentsCount}
                    </div>
                    <div className="flex gap-2 text-xs">
                      {user.pendingDocuments > 0 && (
                        <span className="text-yellow-600">
                          {user.pendingDocuments} en attente
                        </span>
                      )}
                      {user.approvedDocuments > 0 && (
                        <span className="text-green-600">
                          {user.approvedDocuments} approuvés
                        </span>
                      )}
                      {user.rejectedDocuments > 0 && (
                        <span className="text-red-600">
                          {user.rejectedDocuments} rejetés
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  {getStatusBadge(user.verificationStatus)}
                </TableCell>

                <TableCell>
                  {user.lastDocumentSubmitted ? (
                    <div className="text-sm">
                      {formatDistanceToNow(new Date(user.lastDocumentSubmitted), { 
                        addSuffix: true, 
                        locale: fr 
                      })}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">Aucun</span>
                  )}
                </TableCell>

                <TableCell>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(`/admin/users/${user.id}`, '_blank')}
                    >
                      <User className="w-4 h-4 mr-1" />
                      Voir profil
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(`/admin/documents/validation?userId=${user.id}`, '_blank')}
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      Documents
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {users.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Aucun utilisateur trouvé avec des documents soumis
          </div>
        )}
      </CardContent>
    </Card>
  )
} 