'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Upload, X, FileText, AlertCircle } from 'lucide-react'
import { useProviderDocuments } from '../../hooks/useProviderDocuments'

interface DocumentUploadDialogProps {
  isOpen: boolean
  onClose: () => void
  documentType: string
  onSuccess: () => void
}

const DOCUMENT_TYPE_LABELS = {
  IDENTITY: 'Pièce d\'identité',
  CERTIFICATION: 'Certification professionnelle',
  INSURANCE: 'Assurance professionnelle',
  CONTRACT: 'Contrat de travail'
}

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export function DocumentUploadDialog({ 
  isOpen, 
  onClose, 
  documentType, 
  onSuccess 
}: DocumentUploadDialogProps) {
  const { uploadDocument } = useProviderDocuments()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    setError(null)

    if (!selectedFile) {
      return
    }

    // Validation du type
    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setError('Type de fichier non autorisé. Utilisez PDF, JPEG, PNG ou WebP.')
      return
    }

    // Validation de la taille
    if (selectedFile.size > MAX_SIZE) {
      setError('Fichier trop volumineux. Taille maximum : 10MB.')
      return
    }

    setFile(selectedFile)
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setProgress(0)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', documentType)
      formData.append('category', 'document')

      // Simulation de progression
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      await uploadDocument(formData)
      
      clearInterval(progressInterval)
      setProgress(100)
      
      setTimeout(() => {
        onSuccess()
        resetForm()
      }, 500)

    } catch (err) {
      setError('Erreur lors du téléchargement. Veuillez réessayer.')
      setProgress(0)
    } finally {
      setUploading(false)
    }
  }

  const resetForm = () => {
    setFile(null)
    setProgress(0)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = () => {
    if (!uploading) {
      resetForm()
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Télécharger {DOCUMENT_TYPE_LABELS[documentType as keyof typeof DOCUMENT_TYPE_LABELS]}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="file">Sélectionner un fichier</Label>
            <Input
              id="file"
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept={ALLOWED_TYPES.join(',')}
              disabled={uploading}
            />
            <p className="text-xs text-muted-foreground">
              Types autorisés : PDF, JPEG, PNG, WebP (max 10MB)
            </p>
          </div>

          {file && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <FileText className="w-5 h-5 text-gray-600" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setFile(null)}
                disabled={uploading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Téléchargement en cours...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={uploading}
            >
              Annuler
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
            >
              {uploading ? 'Téléchargement...' : 'Télécharger'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 