'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  Clock, 
  X, 
  AlertCircle,
  Download,
  Trash2,
  User,
  Award,
  Shield,
  FileText as FileTextIcon
} from 'lucide-react'
import { useProviderDocuments } from '../../hooks/useProviderDocuments'
import { DocumentUploadDialog } from './document-upload-dialog'
import type { ProviderDocument } from '../../types'

const DOCUMENT_TYPES = {
  IDENTITY: {
    label: 'Pièce d\'identité',
    description: 'Carte d\'identité, passeport ou permis de conduire',
    required: true,
    icon: User
  },
  CERTIFICATION: {
    label: 'Certifications professionnelles',
    description: 'Diplômes, certifications, habilitations professionnelles',
    required: true,
    icon: Award
  },
  INSURANCE: {
    label: 'Assurance professionnelle',
    description: 'Attestation d\'assurance responsabilité civile professionnelle',
    required: false,
    icon: Shield
  },
  CONTRACT: {
    label: 'Contrats de travail',
    description: 'Contrats, conventions, accords professionnels',
    required: false,
    icon: FileText
  }
}

export function ProviderDocumentsManager() {
  const { documents, summary, loading, error, fetchDocuments, deleteDocument } = useProviderDocuments()
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-800'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'REJECTED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return <CheckCircle className="w-4 h-4" />
      case 'PENDING': return <Clock className="w-4 h-4" />
      case 'REJECTED': return <X className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'Approuvé'
      case 'PENDING': return 'En attente'
      case 'REJECTED': return 'Rejeté'
      default: return 'Inconnu'
    }
  }

  const handleUploadClick = (docType: string) => {
    setSelectedDocumentType(docType)
    setUploadDialogOpen(true)
  }

  const handleDeleteDocument = async (documentId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
      try {
        await deleteDocument(documentId)
      } catch (error) {
        console.error('Erreur lors de la suppression:', error)
      }
    }
  }

  const progressValue = summary ? (summary.approved / summary.requiredDocuments.length) * 100 : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec progression */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Progression de validation
            <Badge variant={summary?.canActivate ? 'default' : 'secondary'}>
              {summary?.approved || 0}/{summary?.requiredDocuments.length || 0} validés
            </Badge>
          </CardTitle>
          <CardDescription>
            Téléchargez vos documents pour valider votre compte prestataire
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progression</span>
              <span>{progressValue.toFixed(0)}%</span>
            </div>
            <Progress value={progressValue} className="w-full" />
            {summary?.canActivate ? (
              <p className="text-sm text-green-600 font-medium">
                ✓ Prêt pour activation
              </p>
            ) : (
              <p className="text-sm text-orange-600">
                Documents manquants : {summary?.missing.length || 0}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alertes */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {summary && summary.missing.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Documents requis manquants : {summary.missing.join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {/* Liste des types de documents */}
      <div className="grid gap-6 md:grid-cols-2">
        {Object.entries(DOCUMENT_TYPES).map(([type, config]) => {
          const typeDocuments = documents.filter(doc => doc.type === type)
          const hasDocument = typeDocuments.length > 0
          const latestDoc = hasDocument ? typeDocuments[0] : null
          const IconComponent = config.icon

          return (
            <Card key={type} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <IconComponent className="w-5 h-5 text-gray-600" />
                    <div>
                      <CardTitle className="text-lg">{config.label}</CardTitle>
                      <CardDescription>{config.description}</CardDescription>
                    </div>
                  </div>
                  
                  {config.required && (
                    <Badge variant="outline" className="text-xs">
                      Requis
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                {hasDocument && latestDoc ? (
                  <div className="space-y-3">
                    {/* Document existant */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(latestDoc.validationStatus)}
                        <div>
                          <p className="text-sm font-medium">{latestDoc.originalName}</p>
                          <p className="text-xs text-gray-500">
                            Téléchargé le {new Date(latestDoc.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className={getStatusColor(latestDoc.validationStatus)}>
                          {getStatusLabel(latestDoc.validationStatus)}
                        </Badge>
                        
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(latestDoc.url, '_blank')}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          
                          {latestDoc.validationStatus !== 'APPROVED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteDocument(latestDoc.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Message de validation/rejet */}
                    {latestDoc.validationStatus === 'REJECTED' && latestDoc.rejectionReason && (
                      <Alert variant="destructive">
                        <X className="h-4 w-4" />
                        <AlertDescription>
                          Document rejeté : {latestDoc.rejectionReason}
                        </AlertDescription>
                      </Alert>
                    )}

                    {latestDoc.validationStatus === 'APPROVED' && (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          Document approuvé le {new Date(latestDoc.validatedAt!).toLocaleDateString()}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  /* Pas de document */
                  <div className="text-center py-6">
                    <IconComponent className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-4">Aucun document téléchargé</p>
                    <Button 
                      onClick={() => handleUploadClick(type)}
                      className="flex items-center space-x-2"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Télécharger</span>
                    </Button>
                  </div>
                )}

                {/* Bouton de remplacement si document rejeté ou pour mise à jour */}
                {hasDocument && latestDoc && (latestDoc.validationStatus === 'REJECTED' || latestDoc.validationStatus === 'APPROVED') && (
                  <div className="pt-3 border-t">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleUploadClick(type)}
                      className="w-full"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {latestDoc.validationStatus === 'REJECTED' ? 'Remplacer' : 'Mettre à jour'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Dialog d'upload */}
      <DocumentUploadDialog 
        isOpen={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        documentType={selectedDocumentType}
        onSuccess={() => {
          fetchDocuments()
          setUploadDialogOpen(false)
        }}
      />
    </div>
  )
} 