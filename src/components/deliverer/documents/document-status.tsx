'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { api } from '@/trpc/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from "@/components/ui/use-toast"
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Eye, 
  Download, 
  RefreshCw,
  Camera,
  Calendar,
  User,
  Shield,
  AlertTriangle,
  Info
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

/**
 * Composant de suivi des documents pour les livreurs
 * Implémentation selon la Mission 1 - Gestion complète des documents et vérifications
 */
export default function DocumentStatus() {
  const t = useTranslations('deliverer.documents')
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadDescription, setUploadDescription] = useState('')
  const [selectedDocumentType, setSelectedDocumentType] = useState('')

  // Récupération des données via tRPC
  const { data: documents, isLoading, refetch } = api.deliverer.getDocuments.useQuery()
  const { data: documentTypes } = api.deliverer.getDocumentTypes.useQuery()
  const { data: verificationStatus } = api.deliverer.getVerificationStatus.useQuery()

  // Mutations pour les actions
  const uploadDocumentMutation = api.deliverer.uploadDocument.useMutation({
    onSuccess: () => {
      toast({
        title: t('documentUploaded'),
        description: t('documentUploadedSuccess'),
      })
      setIsUploading(false)
      setSelectedFile(null)
      setUploadDescription('')
      setSelectedDocumentType('')
      refetch()
    },
    onError: (error) => {
      toast({
        title: t('uploadError'),
        description: error.message,
        variant: 'destructive',
      })
      setIsUploading(false)
    }
  })

  const deleteDocumentMutation = api.deliverer.deleteDocument.useMutation({
    onSuccess: () => {
      toast({
        title: t('documentDeleted'),
        description: t('documentDeletedSuccess'),
      })
      refetch()
    },
    onError: (error) => {
      toast({
        title: t('deleteError'),
        description: error.message,
        variant: 'destructive',
      })
    }
  })

  const resubmitDocumentMutation = api.deliverer.resubmitDocument.useMutation({
    onSuccess: () => {
      toast({
        title: t('documentResubmitted'),
        description: t('documentResubmittedSuccess'),
      })
      refetch()
    },
    onError: (error) => {
      toast({
        title: t('resubmitError'),
        description: error.message,
        variant: 'destructive',
      })
    }
  })

  // Gestion de l'upload
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Vérifier la taille du fichier (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: t('fileTooLarge'),
          description: t('fileTooLargeDescription'),
          variant: 'destructive',
        })
        return
      }

      // Vérifier le type de fichier
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: t('invalidFileType'),
          description: t('invalidFileTypeDescription'),
          variant: 'destructive',
        })
        return
      }

      setSelectedFile(file)
    }
  }

  const handleUpload = () => {
    if (!selectedFile || !selectedDocumentType) {
      toast({
        title: t('missingInformation'),
        description: t('missingInformationDescription'),
        variant: 'destructive',
      })
      return
    }

    setIsUploading(true)

    // Créer FormData pour l'upload
    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('documentType', selectedDocumentType)
    formData.append('description', uploadDescription)

    uploadDocumentMutation.mutate({
      file: selectedFile,
      documentType: selectedDocumentType,
      description: uploadDescription
    })
  }

  const handleDelete = (documentId: string) => {
    if (confirm(t('confirmDelete'))) {
      deleteDocumentMutation.mutate({ documentId })
    }
  }

  const handleResubmit = (documentId: string) => {
    resubmitDocumentMutation.mutate({ documentId })
  }

  // Fonction pour obtenir le badge de statut
  const getStatusBadge = (status: string) => {
    const variants = {
      PENDING: 'secondary',
      APPROVED: 'success',
      REJECTED: 'destructive',
      EXPIRED: 'warning',
      UNDER_REVIEW: 'default'
    } as const

    const icons = {
      PENDING: Clock,
      APPROVED: CheckCircle,
      REJECTED: AlertCircle,
      EXPIRED: AlertTriangle,
      UNDER_REVIEW: RefreshCw
    }

    const Icon = icons[status as keyof typeof icons] || Info

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        <Icon className="h-3 w-3 mr-1" />
        {t(`status.${status.toLowerCase()}`)}
      </Badge>
    )
  }

  // Calcul du pourcentage de progression
  const getProgressPercentage = () => {
    if (!documents || !documentTypes) return 0
    
    const requiredDocs = documentTypes.filter(type => type.required)
    const approvedDocs = documents.filter(doc => 
      doc.status === 'APPROVED' && requiredDocs.some(type => type.id === doc.documentTypeId)
    )
    
    return Math.round((approvedDocs.length / requiredDocs.length) * 100)
  }

  const progressPercentage = getProgressPercentage()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec progression */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('documentStatus')}
              </CardTitle>
              <CardDescription className="mt-2">
                {t('documentStatusDescription')}
              </CardDescription>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  {t('uploadDocument')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('uploadNewDocument')}</DialogTitle>
                  <DialogDescription>
                    {t('uploadDocumentDescription')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="documentType">{t('documentType')}</Label>
                    <select
                      id="documentType"
                      value={selectedDocumentType}
                      onChange={(e) => setSelectedDocumentType(e.target.value)}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="">{t('selectDocumentType')}</option>
                      {documentTypes?.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                          {type.required && ' *'}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <Label htmlFor="file">{t('file')}</Label>
                    <Input
                      id="file"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileSelect}
                    />
                    {selectedFile && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="description">{t('description')} ({t('optional')})</Label>
                    <Textarea
                      id="description"
                      value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                      placeholder={t('descriptionPlaceholder')}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedFile(null)
                        setUploadDescription('')
                        setSelectedDocumentType('')
                      }}
                    >
                      {t('cancel')}
                    </Button>
                    <Button
                      onClick={handleUpload}
                      disabled={isUploading || !selectedFile || !selectedDocumentType}
                    >
                      {isUploading ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          {t('uploading')}
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          {t('upload')}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progression globale */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{t('verificationProgress')}</span>
                <span className="text-sm text-muted-foreground">{progressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            {/* Statut de vérification */}
            {verificationStatus && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{t('accountStatus')}</p>
                  <p className="text-sm text-muted-foreground">
                    {verificationStatus.isVerified 
                      ? t('accountVerified') 
                      : t('accountPendingVerification')
                    }
                  </p>
                </div>
                {getStatusBadge(verificationStatus.status)}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Liste des documents */}
      <Card>
        <CardHeader>
          <CardTitle>{t('uploadedDocuments')}</CardTitle>
        </CardHeader>
        <CardContent>
          {documents && documents.length > 0 ? (
            <div className="space-y-4">
              {documents.map((document: any) => (
                <div key={document.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {document.type === 'image' ? (
                        <Camera className="h-8 w-8 text-muted-foreground" />
                      ) : (
                        <FileText className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{document.documentType?.name}</p>
                        {document.documentType?.required && (
                          <Badge variant="outline" className="text-xs">
                            {t('required')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{document.originalName}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(document.uploadedAt), 'dd/MM/yyyy HH:mm')}</span>
                        {document.reviewedAt && (
                          <>
                            <span>•</span>
                            <span>{t('reviewedOn')} {format(new Date(document.reviewedAt), 'dd/MM/yyyy')}</span>
                          </>
                        )}
                      </div>
                      {document.rejectionReason && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                          <strong>{t('rejectionReason')}:</strong> {document.rejectionReason}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getStatusBadge(document.status)}
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(document.url, '_blank')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const link = document.createElement('a')
                          link.href = document.url
                          link.download = document.originalName
                          link.click()
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>

                      {document.status === 'REJECTED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResubmit(document.id)}
                          disabled={resubmitDocumentMutation.isPending}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}

                      {document.status === 'PENDING' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(document.id)}
                          disabled={deleteDocumentMutation.isPending}
                        >
                          <AlertCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t('noDocuments')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('uploadFirstDocument')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents requis manquants */}
      {documentTypes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {t('requiredDocuments')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documentTypes
                .filter(type => type.required)
                .map((type) => {
                  const hasDocument = documents?.some(doc => 
                    doc.documentTypeId === type.id && doc.status === 'APPROVED'
                  )
                  const pendingDocument = documents?.find(doc => 
                    doc.documentTypeId === type.id && doc.status === 'PENDING'
                  )
                  const rejectedDocument = documents?.find(doc => 
                    doc.documentTypeId === type.id && doc.status === 'REJECTED'
                  )

                  return (
                    <div key={type.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {hasDocument ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : pendingDocument ? (
                          <Clock className="h-5 w-5 text-yellow-500" />
                        ) : rejectedDocument ? (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-orange-500" />
                        )}
                        <div>
                          <p className="font-medium">{type.name}</p>
                          <p className="text-sm text-muted-foreground">{type.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasDocument && (
                          <Badge variant="success">{t('approved')}</Badge>
                        )}
                        {pendingDocument && (
                          <Badge variant="secondary">{t('pending')}</Badge>
                        )}
                        {rejectedDocument && (
                          <Badge variant="destructive">{t('rejected')}</Badge>
                        )}
                        {!hasDocument && !pendingDocument && !rejectedDocument && (
                          <Badge variant="outline">{t('missing')}</Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
