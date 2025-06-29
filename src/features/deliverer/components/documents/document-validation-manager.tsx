'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { FileText, Upload, CheckCircle, AlertCircle, Clock, X } from 'lucide-react'

interface DocumentStatus {
  identity: string
  drivingLicense: string  
  insurance: string
  allApproved: boolean
}

interface Document {
  id: string
  type: string
  filename: string
  status: string
  uploadedAt: string
  validatedAt?: string
  rejectionReason?: string
}

export function DocumentValidationManager() {
  const [documentStatus, setDocumentStatus] = useState<DocumentStatus | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadDialog, setUploadDialog] = useState(false)
  const [selectedDocType, setSelectedDocType] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchDocumentStatus()
  }, [])

  const fetchDocumentStatus = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/deliverer/documents')
      if (response.ok) {
        const data = await response.json()
        setDocumentStatus(data.documentStatus)
        setDocuments(data.documents || [])
      }
    } catch (error) {
      console.error('Erreur chargement documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const uploadDocument = async (file: File, type: string) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)

      const response = await fetch('/api/deliverer/documents', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        setUploadDialog(false)
        setSelectedDocType('')
        fetchDocumentStatus() // Recharger les données
      }
    } catch (error) {
      console.error('Erreur upload:', error)
    } finally {
      setUploading(false)
    }
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return {
          label: 'Validé',
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          variant: 'default' as const
        }
      case 'PENDING':
        return {
          label: 'En attente',
          icon: Clock,
          color: 'text-orange-600', 
          bgColor: 'bg-orange-100',
          variant: 'secondary' as const
        }
      case 'REJECTED':
        return {
          label: 'Refusé',
          icon: X,
          color: 'text-red-600',
          bgColor: 'bg-red-100', 
          variant: 'destructive' as const
        }
      default:
        return {
          label: 'Non fourni',
          icon: AlertCircle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          variant: 'secondary' as const
        }
    }
  }

  const requiredDocuments = [
    {
      type: 'IDENTITY',
      label: 'Pièce d\'identité',
      description: 'Carte d\'identité ou passeport en cours de validité',
      status: documentStatus?.identity || 'MISSING'
    },
    {
      type: 'DRIVING_LICENSE', 
      label: 'Permis de conduire',
      description: 'Permis de conduire valide (si véhicule motorisé)',
      status: documentStatus?.drivingLicense || 'MISSING'
    },
    {
      type: 'INSURANCE',
      label: 'Assurance',
      description: 'Attestation d\'assurance responsabilité civile professionnelle',
      status: documentStatus?.insurance || 'MISSING'
    }
  ]

  const getValidationProgress = () => {
    if (!documentStatus) return 0
    const approved = Object.values(documentStatus).filter(status => status === 'APPROVED').length - 1 // -1 pour exclure allApproved
    return (approved / 3) * 100
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold">Validation des documents</h1>
        <p className="text-muted-foreground">
          Transmettez vos pièces justificatives pour être validé comme livreur EcoDeli
        </p>
      </div>

      {/* Statut de validation global */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Progression de validation
          </CardTitle>
          <CardDescription>
            {documentStatus?.allApproved 
              ? 'Félicitations ! Tous vos documents sont validés.'
              : 'Complétez votre dossier pour pouvoir effectuer des livraisons.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Documents validés</span>
                <span>{Math.round(getValidationProgress())}%</span>
              </div>
              <Progress value={getValidationProgress()} className="h-2" />
            </div>
            
            {documentStatus?.allApproved ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Votre profil est validé ! Vous pouvez maintenant accepter des livraisons.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Veuillez compléter la validation de tous vos documents pour pouvoir effectuer des livraisons.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Liste des documents requis */}
      <div className="grid gap-4">
        {requiredDocuments.map((doc) => {
          const statusInfo = getStatusInfo(doc.status)
          const StatusIcon = statusInfo.icon
          
          return (
            <Card key={doc.type}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-full ${statusInfo.bgColor}`}>
                        <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold">{doc.label}</h3>
                        <p className="text-sm text-muted-foreground">{doc.description}</p>
                      </div>
                    </div>
                    
                    {doc.status === 'REJECTED' && (
                      <Alert variant="destructive" className="mt-3">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Document refusé. Raison: {documents.find(d => d.type === doc.type)?.rejectionReason || 'Qualité insuffisante'}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Badge variant={statusInfo.variant}>
                      {statusInfo.label}
                    </Badge>
                    
                    {(doc.status === 'MISSING' || doc.status === 'REJECTED') && (
                      <Dialog open={uploadDialog && selectedDocType === doc.type} onOpenChange={(open) => {
                        setUploadDialog(open)
                        if (open) setSelectedDocType(doc.type)
                      }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Upload className="w-4 h-4 mr-2" />
                            {doc.status === 'MISSING' ? 'Télécharger' : 'Remplacer'}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Télécharger {doc.label}</DialogTitle>
                            <DialogDescription>
                              {doc.description}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) {
                                    uploadDocument(file, doc.type)
                                  }
                                }}
                                disabled={uploading}
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Formats acceptés: PDF, JPG, PNG (max 5MB)
                              </p>
                            </div>
                            
                            {uploading && (
                              <div className="text-center">
                                <p className="text-sm text-muted-foreground">Téléchargement en cours...</p>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Informations complémentaires */}
      <Card>
        <CardHeader>
          <CardTitle>Informations importantes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
              <span>La validation des documents peut prendre jusqu'à 48h ouvrées</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
              <span>Vos documents sont traités de manière confidentielle et sécurisée</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
              <span>Une fois validé, vous pourrez immédiatement accepter des livraisons</span>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5" />
              <span>En cas de refus, vous recevrez une notification avec les motifs</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}