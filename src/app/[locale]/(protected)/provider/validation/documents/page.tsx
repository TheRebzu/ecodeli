'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/auth-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { FileUpload } from '@/components/ui/file-upload'
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Download,
  Eye,
  Trash2,
  Plus,
  Loader2,
  Shield,
  User,
  Building,
  Award,
  Image
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/page-header'

interface DocumentType {
  id: string
  name: string
  description: string
  required: boolean
  acceptedFormats: string[]
  maxSize: number // in MB
}

interface UploadedDocument {
  id: string
  type: string
  name: string
  size: number
  uploadedAt: Date
  status: string
  url: string
  rejectionReason?: string
}

// Types de documents requis pour les prestataires
const REQUIRED_DOCUMENTS: DocumentType[] = [
  {
    id: 'IDENTITY',
    name: 'Pièce d\'identité',
    description: 'Carte d\'identité, passeport ou permis de conduire',
    required: true,
    acceptedFormats: ['.pdf', '.jpg', '.jpeg', '.png'],
    maxSize: 5
  },
  {
    id: 'DRIVING_LICENSE',
    name: 'Permis de conduire',
    description: 'Permis de conduire valide (si applicable)',
    required: false,
    acceptedFormats: ['.pdf', '.jpg', '.jpeg', '.png'],
    maxSize: 5
  },
  {
    id: 'INSURANCE',
    name: 'Attestation d\'assurance',
    description: 'Attestation d\'assurance responsabilité civile',
    required: true,
    acceptedFormats: ['.pdf', '.jpg', '.jpeg', '.png'],
    maxSize: 5
  },
  {
    id: 'CERTIFICATION',
    name: 'Certifications professionnelles',
    description: 'Certifications, diplômes ou attestations de formation',
    required: false,
    acceptedFormats: ['.pdf', '.jpg', '.jpeg', '.png'],
    maxSize: 10
  },
  {
    id: 'CONTRACT',
    name: 'Contrat de prestation',
    description: 'Contrat ou convention de prestation de services',
    required: false,
    acceptedFormats: ['.pdf'],
    maxSize: 10
  }
]

const getDocumentIcon = (type: string) => {
  switch (type) {
    case 'IDENTITY':
      return <User className="h-6 w-6 text-blue-500" />
    case 'DRIVING_LICENSE':
      return <Shield className="h-6 w-6 text-green-500" />
    case 'INSURANCE':
      return <Shield className="h-6 w-6 text-orange-500" />
    case 'CERTIFICATION':
      return <Award className="h-6 w-6 text-purple-500" />
    case 'CONTRACT':
      return <Building className="h-6 w-6 text-gray-500" />
    default:
      return <FileText className="h-6 w-6 text-gray-500" />
  }
}

const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case 'approved':
      return <Badge variant="default" className="bg-green-100 text-green-800">Approuvé</Badge>
    case 'pending':
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">En attente</Badge>
    case 'rejected':
      return <Badge variant="destructive">Rejeté</Badge>
    default:
      return <Badge variant="outline">Inconnu</Badge>
  }
}

export default function ProviderDocumentsPage() {
  const t = useTranslations('provider.validation')
  const { user } = useAuth()
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([])
  const [uploading, setUploading] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkingValidation, setCheckingValidation] = useState(false)

  // Charger les documents existants
  useEffect(() => {
    if (user?.id) {
      loadDocuments()
    }
  }, [user?.id])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/provider/documents?providerId=${user?.id}`)
      
      if (response.ok) {
        const documents = await response.json()
        setUploadedDocuments(documents)
      } else {
        console.error('Erreur lors du chargement des documents')
      }
    } catch (error) {
      console.error('Erreur:', error)
      setError('Erreur lors du chargement des documents')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (documentType: DocumentType, file: File) => {
    setUploading(documentType.id)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', documentType.id)
      formData.append('providerId', user?.id || '')

      const response = await fetch('/api/provider/documents/upload', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        toast.success('Document téléchargé avec succès')
        
        // Ajouter le nouveau document à la liste
        setUploadedDocuments(prev => [
          ...prev.filter(doc => doc.type !== documentType.id),
          {
            id: result.id,
            type: documentType.id,
            name: file.name,
            size: file.size,
            uploadedAt: new Date(),
            status: 'pending',
            url: result.url
          }
        ])
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Erreur lors du téléchargement')
      }
    } catch (error) {
      console.error('Erreur upload:', error)
      toast.error('Erreur lors du téléchargement')
    } finally {
      setUploading(null)
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/provider/documents/${documentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setUploadedDocuments(prev => prev.filter(doc => doc.id !== documentId))
        toast.success('Document supprimé avec succès')
      } else {
        toast.error('Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Erreur suppression:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  // Calculer la progression correctement
  const requiredDocuments = REQUIRED_DOCUMENTS.filter(d => d.required)
  const approvedRequiredDocuments = uploadedDocuments.filter(doc => 
    (doc.status === 'APPROVED' || doc.status === 'approved') && 
    requiredDocuments.some(req => req.id === doc.type)
  )
  
  const progressPercentage = requiredDocuments.length > 0 
    ? Math.min(100, (approvedRequiredDocuments.length / requiredDocuments.length) * 100)
    : 0

  // Debug: Log the calculation
  console.log('🔍 Provider Progress Debug:', {
    totalRequired: requiredDocuments.length,
    approvedRequired: approvedRequiredDocuments.length,
    allUploaded: uploadedDocuments.length,
    allApproved: uploadedDocuments.filter(d => d.status === 'APPROVED').length,
    progressPercentage
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement des documents...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents de validation"
        description="Téléchargez et gérez les documents requis pour la validation de votre compte prestataire."
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Progression */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Progression des documents
          </CardTitle>
          <CardDescription>
            {approvedRequiredDocuments.length} / {requiredDocuments.length} documents requis approuvés
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Documents approuvés</span>
              <span>
                {approvedRequiredDocuments.length} / {requiredDocuments.length}
                {' '}({progressPercentage}%)
              </span>
            </div>
            <Progress 
              value={progressPercentage} 
              className="w-full" 
            />
          </div>
        </CardContent>
      </Card>

      {/* Documents requis */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Documents requis</h2>
        
        {REQUIRED_DOCUMENTS.map((documentType) => {
          const uploadedDoc = uploadedDocuments.find(doc => doc.type === documentType.id)
          
          return (
            <Card key={documentType.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getDocumentIcon(documentType.id)}
                    <div>
                      <CardTitle className="text-lg">{documentType.name}</CardTitle>
                      <CardDescription>{documentType.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {documentType.required && (
                      <Badge variant="destructive">Obligatoire</Badge>
                    )}
                    {uploadedDoc && getStatusBadge(uploadedDoc.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {uploadedDoc ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="font-medium">{uploadedDoc.name}</p>
                            <p className="text-sm text-gray-600">
                              {(uploadedDoc.size / 1024 / 1024).toFixed(2)} MB • 
                              Téléchargé le {new Date(uploadedDoc.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <a href={uploadedDoc.url} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-4 w-4 mr-1" />
                              Voir
                            </a>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteDocument(uploadedDoc.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Supprimer
                          </Button>
                        </div>
                      </div>

                      {/* Message de rejet */}
                      {uploadedDoc?.status === 'rejected' && uploadedDoc.rejectionReason && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Raison du rejet:</strong> {uploadedDoc.rejectionReason}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ) : (
                    <FileUpload
                      onUpload={(file) => handleFileUpload(documentType, file)}
                      acceptedTypes={documentType.acceptedFormats}
                      maxSize={documentType.maxSize}
                      uploading={uploading === documentType.id}
                      disabled={uploading !== null}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => window.history.back()}>
          Retour
        </Button>
        <div className="flex gap-2">
          <Button 
            onClick={async () => {
              console.log('🔍 Button clicked: Checking validation for providerId:', user?.id)
              setCheckingValidation(true)
              try {
                const response = await fetch('/api/provider/validation/check', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ providerId: user?.id })
                })

                console.log('🔍 Response status:', response.status)

                if (response.ok) {
                  const result = await response.json()
                  console.log('🔍 Validation check result:', result)
                  
                  if (result.success) {
                    if (result.validationStatus === 'READY') {
                      toast.success(result.message)
                    } else if (result.validationStatus === 'PENDING') {
                      toast.info(result.message)
                    } else if (result.validationStatus === 'REJECTED') {
                      toast.error(result.message)
                    } else if (result.validationStatus === 'MISSING_DOCUMENTS') {
                      toast.error(result.message)
                    } else if (result.validationStatus === 'INCOMPLETE_PROFILE') {
                      toast.error(result.message)
                      // Afficher un bouton pour compléter le profil
                      toast.error('Cliquez sur "Compléter le profil" pour ajouter les informations manquantes')
                    } else {
                      toast.info(result.message)
                    }
                  } else {
                    toast.error('Erreur lors de la vérification')
                  }
                } else {
                  const errorText = await response.text()
                  console.error('❌ Response not ok:', errorText)
                  toast.error('Erreur lors de la vérification')
                }
              } catch (error) {
                console.error('❌ Erreur vérification:', error)
                toast.error('Erreur lors de la vérification')
              } finally {
                setCheckingValidation(false)
              }
            }}
            disabled={checkingValidation}
          >
            {checkingValidation ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Vérification...
              </>
            ) : (
              'Vérifier la validation'
            )}
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/fr/provider/validation/profile'}
          >
            Compléter le profil
          </Button>
        </div>
      </div>
    </div>
  )
} 