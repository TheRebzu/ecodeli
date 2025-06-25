 'use client'

import { useEffect, useState } from 'react'
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
  Trash2
} from 'lucide-react'
import { useDelivererDocuments } from '../../hooks/useDelivererData'
// Import removed - circular reference
import { useTranslations } from 'next-intl'
import type { DelivererDocument } from '../../types'

const DOCUMENT_TYPES = {
  IDENTITY: {
    label: 'Pièce d\'identité',
    description: 'Carte d\'identité, passeport ou permis de conduire',
    required: true
  },
  DRIVING_LICENSE: {
    label: 'Permis de conduire',
    description: 'Permis de conduire en cours de validité',
    required: true
  },
  INSURANCE: {
    label: 'Assurance véhicule',
    description: 'Attestation d\'assurance de votre véhicule',
    required: true
  },
  CERTIFICATION: {
    label: 'Certifications',
    description: 'Certifications professionnelles (optionnel)',
    required: false
  }
}

export function DocumentManager() {
  const { documents, summary, loading, error, fetchDocuments, deleteDocument } = useDelivererDocuments()
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('')
  const t = useTranslations('deliverer.documents')

  useEffect(() => {
    fetchDocuments()
  }, [])

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

  const handleUploadClick = (docType: string) => {
    setSelectedDocumentType(docType)
    setUploadDialogOpen(true)
  }

  const handleDeleteDocument = async (documentId: string) => {
    if (confirm(t('delete_confirm'))) {
      try {
        await deleteDocument(documentId)
        await fetchDocuments() // Refresh
      } catch (error) {
        console.error('Error deleting document:', error)
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
            {t('title')}
            <Badge variant={summary?.canActivate ? 'default' : 'secondary'}>
              {summary?.approved || 0}/{summary?.requiredDocuments.length || 0} {t('validated')}
            </Badge>
          </CardTitle>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{t('progress')}</span>
              <span>{progressValue.toFixed(0)}%</span>
            </div>
            <Progress value={progressValue} className="w-full" />
            {summary?.canActivate ? (
              <p className="text-sm text-green-600 font-medium">
                ✓ {t('ready_for_activation')}
              </p>
            ) : (
              <p className="text-sm text-orange-600">
                {t('missing_documents')}: {summary?.missing.length || 0}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alertes */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {summary && summary.missing.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t('missing_required')}: {summary.missing.join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {/* Liste des types de documents */}
      <div className="grid gap-4">
        {Object.entries(DOCUMENT_TYPES).map(([type, config]) => {
          const typeDocuments = documents.filter(doc => doc.type === type)
          const hasDocument = typeDocuments.length > 0
          const latestDoc = hasDocument ? typeDocuments[0] : null

          return (
            <Card key={type} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-gray-600" />
                    <div>
                      <CardTitle className="text-lg">{config.label}</CardTitle>
                      <CardDescription>{config.description}</CardDescription>
                    </div>
                  </div>
                  
                  {config.required && (
                    <Badge variant="outline" className="text-xs">
                      {t('required')}
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
                        {getStatusIcon(latestDoc.status)}
                        <div>
                          <p className="text-sm font-medium">{latestDoc.filename}</p>
                          <p className="text-xs text-gray-500">
                            {t('uploaded_on')} {new Date(latestDoc.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className={getStatusColor(latestDoc.status)}>
                          {t(`status.${latestDoc.status.toLowerCase()}`)}
                        </Badge>
                        
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(latestDoc.url, '_blank')}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          
                          {latestDoc.status !== 'APPROVED' && (
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
                    {latestDoc.status === 'REJECTED' && (
                      <Alert variant="destructive">
                        <X className="h-4 w-4" />
                        <AlertDescription>
                          {t('document_rejected')}
                        </AlertDescription>
                      </Alert>
                    )}

                    {latestDoc.status === 'APPROVED' && latestDoc.validatedAt && (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          {t('document_approved')} {new Date(latestDoc.validatedAt).toLocaleDateString()}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  /* Pas de document */
                  <div className="text-center py-6">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-4">{t('no_document')}</p>
                    <Button 
                      onClick={() => handleUploadClick(type)}
                      className="flex items-center space-x-2"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{t('upload')}</span>
                    </Button>
                  </div>
                )}

                {/* Bouton de remplacement si document rejeté ou pour mise à jour */}
                {hasDocument && latestDoc && (latestDoc.status === 'REJECTED' || latestDoc.status === 'APPROVED') && (
                  <div className="pt-3 border-t">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleUploadClick(type)}
                      className="w-full"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {latestDoc.status === 'REJECTED' ? t('replace') : t('update')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Dialog d'upload */}
      {/* Dialog d'upload - TODO: Implement DocumentUploadDialog component */}
      {uploadDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <h3>Upload Dialog pour {selectedDocumentType}</h3>
            <Button onClick={() => setUploadDialogOpen(false)}>Fermer</Button>
          </div>
        </div>
      )}
    </div>
  )
}

// Export DocumentUploadDialog as a placeholder component
export function DocumentUploadDialog({ isOpen, onClose, documentType, onSuccess }: {
  isOpen: boolean
  onClose: () => void
  documentType: string
  onSuccess: () => void
}) {
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4">Upload {documentType}</h3>
        <p className="mb-4">Composant d'upload en cours de développement</p>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => { onSuccess(); onClose(); }}>Simuler Upload</Button>
        </div>
      </div>
    </div>
  )
}