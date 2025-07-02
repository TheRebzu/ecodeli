'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Download,
  Search,
  Filter,
  BarChart3,
  Users,
  AlertCircle
} from 'lucide-react'
import { DocumentValidationTable } from './document-validation-table'
import { DocumentValidationStats } from './document-validation-stats'
import { DocumentViewer } from './document-viewer'

interface Document {
  id: string
  type: string
  name: string
  url: string
  validationStatus: string
  createdAt: string
  user: {
    id: string
    email: string
    role: string
    profile?: {
      firstName?: string
      lastName?: string
    }
    deliverer?: any
    provider?: any
    merchant?: any
  }
  validator?: {
    user: {
      profile?: {
        firstName?: string
        lastName?: string
      }
    }
  }
  validationNotes?: string
}

interface ValidationStats {
  total: number
  pending: number
  approved: number
  rejected: number
  approvalRate: string
  byType: Record<string, any>
}

interface DocumentValidationDashboardProps {
  initialUserId?: string
}

export function DocumentValidationDashboard({ initialUserId }: DocumentValidationDashboardProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [stats, setStats] = useState<ValidationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [filters, setFilters] = useState({
    status: 'ALL',
    type: 'ALL',
    userRole: 'ALL',
    search: '',
    userId: initialUserId || ''
  })

  const fetchDocuments = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.status && filters.status !== 'ALL') params.append('status', filters.status)
      if (filters.type && filters.type !== 'ALL') params.append('type', filters.type)
      if (filters.userRole && filters.userRole !== 'ALL') params.append('userRole', filters.userRole)
      if (filters.userId) params.append('userId', filters.userId)

      const response = await fetch(`/api/admin/documents/pending?${params}`)
      const data = await response.json()
      
      if (data.success) {
        let filteredDocs = data.documents
        
        // Filtrage par recherche
        if (filters.search) {
          const searchTerm = filters.search.toLowerCase()
          filteredDocs = filteredDocs.filter((doc: Document) => 
            doc.name.toLowerCase().includes(searchTerm) ||
            doc.user.email.toLowerCase().includes(searchTerm) ||
            `${doc.user.profile?.firstName || ''} ${doc.user.profile?.lastName || ''}`.toLowerCase().includes(searchTerm)
          )
        }
        
        setDocuments(filteredDocs)
      }
    } catch (error) {
      console.error('Erreur chargement documents:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/documents/stats')
      const data = await response.json()
      
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Erreur chargement statistiques:', error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchDocuments(), fetchStats()])
      setLoading(false)
    }
    
    loadData()
  }, [filters.status, filters.type, filters.userRole, filters.userId])

  useEffect(() => {
    // Recherche avec délai
    const timeoutId = setTimeout(() => {
      if (filters.search !== '') {
        fetchDocuments()
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [filters.search])

  const handleValidation = async (documentId: string, status: 'APPROVED' | 'REJECTED', notes?: string) => {
    try {
      const response = await fetch('/api/admin/documents/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, action: status, reason: notes })
      })

      const data = await response.json()
      
      if (data.success) {
        await fetchDocuments()
        await fetchStats()
        setSelectedDocument(null)
      } else {
        console.error('Erreur validation:', data.error || data.message || 'Erreur inconnue')
      }
    } catch (error) {
      console.error('Erreur validation document:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="text-yellow-600"><Clock className="w-3 h-3 mr-1" />En attente</Badge>
      case 'APPROVED':
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Approuvé</Badge>
      case 'REJECTED':
        return <Badge variant="outline" className="text-red-600"><XCircle className="w-3 h-3 mr-1" />Rejeté</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'IDENTITY': 'Pièce d\'identité',
      'DRIVING_LICENSE': 'Permis de conduire',
      'INSURANCE': 'Assurance',
      'VEHICLE_REGISTRATION': 'Carte grise',
      'CERTIFICATION': 'Certification',
      'OTHER': 'Autre'
    }
    return labels[type] || type
  }

  const getUrgencyLevel = (document: Document) => {
    const daysSinceSubmission = Math.floor(
      (new Date().getTime() - new Date(document.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    )
    
    if (daysSinceSubmission > 7) return 'high'
    if (daysSinceSubmission > 3) return 'medium'
    return 'low'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement des documents...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total documents</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold text-yellow-600">{stats?.pending || 0}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approuvés</p>
                <p className="text-2xl font-bold text-green-600">{stats?.approved || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taux d'approbation</p>
                <p className="text-2xl font-bold">{stats?.approvalRate || 0}%</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Indicateur de filtrage par utilisateur */}
      {filters.userId && (
        <Alert>
          <Users className="h-4 w-4" />
          <AlertDescription>
            Documents filtrés pour l'utilisateur spécifique (ID: {filters.userId})
            <Button
              variant="link"
              className="p-0 h-auto ml-2"
              onClick={() => setFilters({ ...filters, userId: '' })}
            >
              Voir tous les documents
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>

            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                <SelectItem value="PENDING">En attente</SelectItem>
                <SelectItem value="APPROVED">Approuvés</SelectItem>
                <SelectItem value="REJECTED">Rejetés</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.type}
              onValueChange={(value) => setFilters({ ...filters, type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Type de document" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les types</SelectItem>
                <SelectItem value="IDENTITY">Pièce d'identité</SelectItem>
                <SelectItem value="DRIVING_LICENSE">Permis de conduire</SelectItem>
                <SelectItem value="INSURANCE">Assurance</SelectItem>
                <SelectItem value="VEHICLE_REGISTRATION">Carte grise</SelectItem>
                <SelectItem value="CERTIFICATION">Certification</SelectItem>
                <SelectItem value="OTHER">Autre</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.userRole}
              onValueChange={(value) => setFilters({ ...filters, userRole: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Rôle utilisateur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les rôles</SelectItem>
                <SelectItem value="DELIVERER">Livreurs</SelectItem>
                <SelectItem value="PROVIDER">Prestataires</SelectItem>
                <SelectItem value="MERCHANT">Commerçants</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Onglets principaux */}
      <Tabs defaultValue="documents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Documents ({documents.length})
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Statistiques
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents">
          <DocumentValidationTable
            documents={documents}
            onValidate={handleValidation}
            onView={setSelectedDocument}
            getStatusBadge={getStatusBadge}
            getDocumentTypeLabel={getDocumentTypeLabel}
            getUrgencyLevel={getUrgencyLevel}
          />
        </TabsContent>

        <TabsContent value="stats">
          <DocumentValidationStats stats={stats} />
        </TabsContent>
      </Tabs>

      {/* Viewer de document */}
      {selectedDocument && (
        <DocumentViewer
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
          onValidate={handleValidation}
          getStatusBadge={getStatusBadge}
          getDocumentTypeLabel={getDocumentTypeLabel}
        />
      )}
    </div>
  )
}