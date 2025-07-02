'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Upload, FileText, CheckCircle, XCircle, Clock, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'

interface Document {
  id: string
  type: string
  name: string
  fileName: string
  status: string
  uploadedAt: string
  rejectionReason?: string
  downloadUrl: string
}

interface CandidacyStatus {
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'
  message: string
}

interface RecruitmentApplication {
  id: string
  status: string
  documents: Document[]
  validationProgress: number
  rejectionReason?: string
}

export function DelivererCandidacy() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [application, setApplication] = useState<RecruitmentApplication | null>(null)
  const [candidacyStatus, setCandidacyStatus] = useState<CandidacyStatus>({
    status: 'DRAFT',
    message: 'Votre candidature est en cours de préparation.'
  })

  useEffect(() => {
    if (user) {
      fetchCandidacyData()
    }
  }, [user])

  const fetchCandidacyData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/deliverer/recruitment?userId=${user?.id}`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.application) {
          setApplication(data.application)
          updateCandidacyStatus(data.application.status)
        }
      } else {
        console.error('Erreur lors du chargement de la candidature')
        toast.error('Impossible de charger les données de candidature')
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la candidature:', error)
      toast.error('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  const updateCandidacyStatus = (status: string) => {
    const statusConfig = {
      'DRAFT': {
        status: 'DRAFT' as const,
        message: 'Votre candidature est en cours de préparation. Complétez tous les documents requis.'
      },
      'SUBMITTED': {
        status: 'SUBMITTED' as const,
        message: 'Votre candidature a été soumise et est en cours d\'examen par notre équipe.'
      },
      'APPROVED': {
        status: 'APPROVED' as const,
        message: 'Votre candidature a été validée. Vous pouvez maintenant accepter des livraisons.'
      },
      'REJECTED': {
        status: 'REJECTED' as const,
        message: 'Votre candidature a été rejetée. Veuillez consulter les détails ci-dessous.'
      }
    }

    setCandidacyStatus(statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-800'
      case 'REJECTED': return 'bg-red-100 text-red-800'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'SUBMITTED': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return <CheckCircle className="w-4 h-4" />
      case 'REJECTED': return <XCircle className="w-4 h-4" />
      case 'PENDING': return <Clock className="w-4 h-4" />
      case 'SUBMITTED': return <Clock className="w-4 h-4" />
      default: return <AlertCircle className="w-4 h-4" />
    }
  }

  const getCandidacyStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-50 border-green-200'
      case 'REJECTED': return 'bg-red-50 border-red-200'
      case 'SUBMITTED': return 'bg-blue-50 border-blue-200'
      case 'DRAFT': return 'bg-yellow-50 border-yellow-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  const getCandidacyStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'REJECTED': return <XCircle className="w-5 h-5 text-red-600" />
      case 'SUBMITTED': return <Clock className="w-5 h-5 text-blue-600" />
      case 'DRAFT': return <AlertCircle className="w-5 h-5 text-yellow-600" />
      default: return <AlertCircle className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'Approuvé'
      case 'REJECTED': return 'Rejeté'
      case 'PENDING': return 'En attente'
      case 'SUBMITTED': return 'Soumis'
      default: return 'Inconnu'
    }
  }

  const getCandidacyStatusLabel = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'Approuvée'
      case 'REJECTED': return 'Rejetée'
      case 'SUBMITTED': return 'Soumise'
      case 'DRAFT': return 'En cours'
      default: return 'Inconnue'
    }
  }

  const handleReplaceDocument = (documentId: string) => {
    // Logique pour remplacer un document
    console.log('Remplacer document:', documentId)
    toast.info('Fonctionnalité de remplacement en cours de développement')
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (!application) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Candidature Livreur</h2>
          <p className="text-muted-foreground">
            Gérez votre candidature et documents justificatifs
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Aucune candidature trouvée</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Vous n'avez pas encore soumis de candidature de livreur.
            </p>
            <Button className="mt-4">
              Créer une candidature
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Candidature Livreur</h2>
        <p className="text-muted-foreground">
          Gérez votre candidature et documents justificatifs
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getCandidacyStatusIcon(candidacyStatus.status)}
            Candidature {getCandidacyStatusLabel(candidacyStatus.status)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`p-4 rounded-lg border ${getCandidacyStatusColor(candidacyStatus.status)}`}>
            <p className={candidacyStatus.status === 'APPROVED' ? 'text-green-800' : 
                         candidacyStatus.status === 'REJECTED' ? 'text-red-800' : 
                         candidacyStatus.status === 'SUBMITTED' ? 'text-blue-800' : 'text-yellow-800'}>
              {candidacyStatus.message}
            </p>
            {application.rejectionReason && candidacyStatus.status === 'REJECTED' && (
              <div className="mt-3 p-3 bg-red-100 rounded border border-red-200">
                <p className="text-sm text-red-800 font-medium">Raison du rejet :</p>
                <p className="text-sm text-red-700">{application.rejectionReason}</p>
              </div>
            )}
            {application.validationProgress > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-sm text-muted-foreground mb-1">
                  <span>Progression de validation</span>
                  <span>{application.validationProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${application.validationProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents justificatifs</CardTitle>
        </CardHeader>
        <CardContent>
          {application.documents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {application.documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {doc.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(doc.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(doc.status)}
                          {getStatusLabel(doc.status)}
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(doc.uploadedAt).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleReplaceDocument(doc.id)}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Remplacer
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(doc.downloadUrl, '_blank')}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Voir
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucun document uploadé</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 