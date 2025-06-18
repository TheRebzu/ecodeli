'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { api } from '@/trpc/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from "@/components/ui/use-toast"
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  FileText, 
  Download, 
  Edit, 
  CheckCircle, 
  AlertCircle,
  Camera,
  MessageSquare,
  Euro,
  Star
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface InterventionDetailProps {
  interventionId: string
  onUpdate?: () => void
}

/**
 * Composant de détail d'intervention pour les prestataires
 * Implémentation selon la Mission 1 - Gestion complète des interventions
 */
export default function InterventionDetail({ interventionId, onUpdate }: InterventionDetailProps) {
  const t = useTranslations('provider.interventions')
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)

  // Récupération des données d'intervention via tRPC
  const { data: intervention, isLoading, refetch } = api.provider.getInterventionById.useQuery({
    interventionId
  })

  // Mutations pour les actions
  const addNoteMutation = api.provider.addInterventionNote.useMutation({
    onSuccess: () => {
      toast({
        title: t('noteAdded'),
        description: t('noteAddedSuccess'),
      })
      setNewNote('')
      setIsEditingNotes(false)
      refetch()
      onUpdate?.()
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      })
    }
  })

  const updateStatusMutation = api.provider.updateInterventionStatus.useMutation({
    onSuccess: () => {
      toast({
        title: t('statusUpdated'),
        description: t('statusUpdatedSuccess'),
      })
      refetch()
      onUpdate?.()
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      })
    }
  })

  const generateReportMutation = api.provider.generateInterventionReport.useMutation({
    onSuccess: (data) => {
      // Télécharger le rapport PDF
      const link = document.createElement('a')
      link.href = data.reportUrl
      link.download = `rapport-intervention-${interventionId}.pdf`
      link.click()
      
      toast({
        title: t('reportGenerated'),
        description: t('reportGeneratedSuccess'),
      })
      setIsGeneratingReport(false)
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      })
      setIsGeneratingReport(false)
    }
  })

  // Gestion des actions
  const handleAddNote = () => {
    if (!newNote.trim()) return
    
    addNoteMutation.mutate({
      interventionId,
      note: newNote.trim()
    })
  }

  const handleStatusUpdate = (newStatus: string) => {
    updateStatusMutation.mutate({
      interventionId,
      status: newStatus
    })
  }

  const handleGenerateReport = () => {
    setIsGeneratingReport(true)
    generateReportMutation.mutate({ interventionId })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!intervention) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">{t('interventionNotFound')}</p>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      SCHEDULED: 'secondary',
      IN_PROGRESS: 'default',
      COMPLETED: 'success',
      CANCELLED: 'destructive',
      ON_HOLD: 'warning'
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {t(`status.${status.toLowerCase()}`)}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête de l'intervention */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {intervention.title}
              </CardTitle>
              <CardDescription className="mt-2">
                {t('interventionId')}: {intervention.id}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(intervention.status)}
              <Badge variant="outline">
                {intervention.priority === 'HIGH' && '🔴'}
                {intervention.priority === 'MEDIUM' && '🟡'}
                {intervention.priority === 'LOW' && '🟢'}
                {t(`priority.${intervention.priority.toLowerCase()}`)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Date et heure */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {format(new Date(intervention.scheduledDate), 'dd MMMM yyyy', { locale: fr })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(intervention.scheduledDate), 'HH:mm')} - 
                  {format(new Date(intervention.estimatedEndTime), 'HH:mm')}
                </p>
              </div>
            </div>

            {/* Durée estimée */}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{intervention.estimatedDuration}h</p>
                <p className="text-xs text-muted-foreground">{t('estimatedDuration')}</p>
              </div>
            </div>

            {/* Adresse */}
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{intervention.address}</p>
                <p className="text-xs text-muted-foreground">{intervention.city}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informations client */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t('clientInformation')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar>
              <AvatarImage src={intervention.client?.avatar} />
              <AvatarFallback>
                {intervention.client?.name?.charAt(0) || 'C'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{intervention.client?.name}</p>
              <p className="text-sm text-muted-foreground">{intervention.client?.email}</p>
              <p className="text-sm text-muted-foreground">{intervention.client?.phone}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">{intervention.client?.rating || 'N/A'}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {intervention.client?.reviewsCount || 0} {t('reviews')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Description de l'intervention */}
      <Card>
        <CardHeader>
          <CardTitle>{t('description')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{intervention.description}</p>
          
          {intervention.requirements && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">{t('requirements')}</h4>
              <ul className="text-sm space-y-1">
                {intervention.requirements.map((req: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Matériaux et coûts */}
      {intervention.materials && intervention.materials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="h-5 w-5" />
              {t('materialsAndCosts')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {intervention.materials.map((material: any, index: number) => (
                <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{material.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('quantity')}: {material.quantity} {material.unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{material.totalPrice}€</p>
                    <p className="text-sm text-muted-foreground">
                      {material.unitPrice}€/{material.unit}
                    </p>
                  </div>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between items-center font-medium">
                <span>{t('totalMaterials')}</span>
                <span>{intervention.totalMaterialsCost}€</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photos de l'intervention */}
      {intervention.photos && intervention.photos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              {t('photos')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {intervention.photos.map((photo: any, index: number) => (
                <div key={index} className="relative group">
                  <img
                    src={photo.url}
                    alt={photo.description || `Photo ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => window.open(photo.url, '_blank')}
                    >
                      {t('viewFull')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes et commentaires */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {t('notesAndComments')}
            </CardTitle>
            <Dialog open={isEditingNotes} onOpenChange={setIsEditingNotes}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  {t('addNote')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('addNote')}</DialogTitle>
                  <DialogDescription>
                    {t('addNoteDescription')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="note">{t('note')}</Label>
                    <Textarea
                      id="note"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder={t('notePlaceholder')}
                      rows={4}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditingNotes(false)}
                    >
                      {t('cancel')}
                    </Button>
                    <Button
                      onClick={handleAddNote}
                      disabled={addNoteMutation.isPending || !newNote.trim()}
                    >
                      {addNoteMutation.isPending ? t('adding') : t('add')}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {intervention.notes && intervention.notes.length > 0 ? (
            <div className="space-y-4">
              {intervention.notes.map((note: any, index: number) => (
                <div key={index} className="border-l-4 border-primary pl-4 py-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{note.author}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(note.createdAt), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                  <p className="text-sm">{note.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              {t('noNotes')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('actions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {intervention.status === 'SCHEDULED' && (
              <Button
                onClick={() => handleStatusUpdate('IN_PROGRESS')}
                disabled={updateStatusMutation.isPending}
              >
                {t('startIntervention')}
              </Button>
            )}
            
            {intervention.status === 'IN_PROGRESS' && (
              <Button
                onClick={() => handleStatusUpdate('COMPLETED')}
                disabled={updateStatusMutation.isPending}
              >
                {t('completeIntervention')}
              </Button>
            )}

            <Button
              variant="outline"
              onClick={handleGenerateReport}
              disabled={isGeneratingReport || generateReportMutation.isPending}
            >
              <Download className="h-4 w-4 mr-2" />
              {isGeneratingReport ? t('generating') : t('generateReport')}
            </Button>

            {intervention.status !== 'CANCELLED' && (
              <Button
                variant="destructive"
                onClick={() => handleStatusUpdate('CANCELLED')}
                disabled={updateStatusMutation.isPending}
              >
                {t('cancelIntervention')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
