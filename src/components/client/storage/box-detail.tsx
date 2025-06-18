'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { api } from '@/trpc/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import { 
  Package, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Euro, 
  Edit, 
  Trash2, 
  AlertCircle,
  CheckCircle,
  Key,
  Camera,
  FileText,
  Download,
  QrCode,
  Shield,
  Thermometer,
  Zap
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface BoxDetailProps {
  boxId: string
  onUpdate?: () => void
}

/**
 * Composant de détail de box de stockage pour les clients
 * Implémentation selon la Mission 1 - Gestion complète des espaces de stockage
 */
export default function BoxDetail({ boxId, onUpdate }: BoxDetailProps) {
  const t = useTranslations('client.storage')
  const [isExtending, setIsExtending] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [extensionMonths, setExtensionMonths] = useState(1)
  const [boxName, setBoxName] = useState('')
  const [boxDescription, setBoxDescription] = useState('')

  // Récupération des données de la box via tRPC
  const { data: box, isLoading, refetch } = api.client.getBoxById.useQuery({
    boxId
  })

  // Récupération de l'historique d'accès
  const { data: accessHistory } = api.client.getBoxAccessHistory.useQuery({
    boxId
  })

  // Mutations pour les actions
  const extendReservationMutation = api.client.extendBoxReservation.useMutation({
    onSuccess: () => {
      toast({
        title: t('reservationExtended'),
        description: t('reservationExtendedSuccess'),
      })
      setIsExtending(false)
      setExtensionMonths(1)
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

  const updateBoxMutation = api.client.updateBoxInfo.useMutation({
    onSuccess: () => {
      toast({
        title: t('boxUpdated'),
        description: t('boxUpdatedSuccess'),
      })
      setIsEditing(false)
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

  const generateAccessCodeMutation = api.client.generateBoxAccessCode.useMutation({
    onSuccess: (data) => {
      toast({
        title: t('accessCodeGenerated'),
        description: t('accessCodeGeneratedSuccess'),
      })
      refetch()
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      })
    }
  })

  const cancelReservationMutation = api.client.cancelBoxReservation.useMutation({
    onSuccess: () => {
      toast({
        title: t('reservationCancelled'),
        description: t('reservationCancelledSuccess'),
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

  // Gestion des actions
  const handleExtendReservation = () => {
    extendReservationMutation.mutate({
      boxId,
      additionalMonths: extensionMonths
    })
  }

  const handleUpdateBox = () => {
    if (!boxName.trim()) return
    
    updateBoxMutation.mutate({
      boxId,
      name: boxName.trim(),
      description: boxDescription.trim()
    })
  }

  const handleGenerateAccessCode = () => {
    generateAccessCodeMutation.mutate({ boxId })
  }

  const handleCancelReservation = () => {
    if (confirm(t('confirmCancelReservation'))) {
      cancelReservationMutation.mutate({ boxId })
    }
  }

  // Initialisation des valeurs d'édition
  React.useEffect(() => {
    if (box) {
      setBoxName(box.name || '')
      setBoxDescription(box.description || '')
    }
  }, [box])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!box) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">{t('boxNotFound')}</p>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      ACTIVE: 'success',
      EXPIRED: 'destructive',
      PENDING: 'secondary',
      CANCELLED: 'outline'
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {t(`status.${status.toLowerCase()}`)}
      </Badge>
    )
  }

  const getSizeBadge = (size: string) => {
    const colors = {
      SMALL: 'bg-blue-100 text-blue-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      LARGE: 'bg-red-100 text-red-800',
      EXTRA_LARGE: 'bg-purple-100 text-purple-800'
    } as const

    return (
      <Badge className={colors[size as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {t(`size.${size.toLowerCase()}`)}
      </Badge>
    )
  }

  const isExpiringSoon = box.endDate && new Date(box.endDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  return (
    <div className="space-y-6">
      {/* En-tête de la box */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {box.name || t('defaultBoxName')}
              </CardTitle>
              <CardDescription className="mt-2">
                {t('boxId')}: {box.id}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(box.status)}
              {getSizeBadge(box.size)}
              {isExpiringSoon && (
                <Badge variant="destructive">
                  {t('expiringSoon')}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Localisation */}
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{box.warehouse?.name}</p>
                <p className="text-xs text-muted-foreground">{box.warehouse?.address}</p>
              </div>
            </div>

            {/* Dates */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {format(new Date(box.startDate), 'dd MMM yyyy', { locale: fr })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('until')} {format(new Date(box.endDate), 'dd MMM yyyy', { locale: fr })}
                </p>
              </div>
            </div>

            {/* Prix */}
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{box.monthlyPrice}€/{t('month')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('totalPaid')}: {box.totalPaid}€
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informations détaillées */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Caractéristiques de la box */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {t('boxCharacteristics')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">{t('dimensions')}</Label>
                <p className="font-medium">{box.dimensions}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t('volume')}</Label>
                <p className="font-medium">{box.volume} m³</p>
              </div>
            </div>

            {/* Équipements */}
            <div>
              <Label className="text-xs text-muted-foreground">{t('equipment')}</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {box.hasClimateControl && (
                  <Badge variant="outline" className="text-xs">
                    <Thermometer className="h-3 w-3 mr-1" />
                    {t('climateControl')}
                  </Badge>
                )}
                {box.hasElectricity && (
                  <Badge variant="outline" className="text-xs">
                    <Zap className="h-3 w-3 mr-1" />
                    {t('electricity')}
                  </Badge>
                )}
                {box.hasSecurity && (
                  <Badge variant="outline" className="text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    {t('security')}
                  </Badge>
                )}
              </div>
            </div>

            {/* Description */}
            {box.description && (
              <div>
                <Label className="text-xs text-muted-foreground">{t('description')}</Label>
                <p className="text-sm mt-1">{box.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Accès et sécurité */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              {t('accessAndSecurity')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Code d'accès actuel */}
            {box.currentAccessCode && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">{t('currentAccessCode')}</Label>
                  <Badge variant="outline" className="text-xs">
                    {t('expires')} {format(new Date(box.currentAccessCode.expiresAt), 'dd/MM HH:mm')}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-lg font-mono bg-background px-2 py-1 rounded">
                    {box.currentAccessCode.code}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(box.currentAccessCode.code)}
                  >
                    {t('copy')}
                  </Button>
                </div>
              </div>
            )}

            {/* QR Code d'accès */}
            {box.qrCode && (
              <div className="text-center">
                <div className="inline-block p-4 bg-white rounded-lg border">
                  <img
                    src={box.qrCode}
                    alt={t('accessQrCode')}
                    className="w-32 h-32"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {t('qrCodeDescription')}
                </p>
              </div>
            )}

            {/* Actions d'accès */}
            <div className="space-y-2">
              <Button
                onClick={handleGenerateAccessCode}
                disabled={generateAccessCodeMutation.isPending}
                className="w-full"
              >
                <QrCode className="h-4 w-4 mr-2" />
                {generateAccessCodeMutation.isPending ? t('generating') : t('generateNewCode')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historique d'accès */}
      {accessHistory && accessHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t('accessHistory')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {accessHistory.slice(0, 10).map((access: any, index: number) => (
                <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      access.type === 'ENTRY' ? 'bg-green-500' : 'bg-orange-500'
                    }`} />
                    <div>
                      <p className="text-sm font-medium">
                        {access.type === 'ENTRY' ? t('entry') : t('exit')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {access.method} - {access.user}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(access.timestamp), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('actions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {/* Éditer les informations */}
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  {t('editInfo')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('editBoxInfo')}</DialogTitle>
                  <DialogDescription>
                    {t('editBoxInfoDescription')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">{t('boxName')}</Label>
                    <Input
                      id="name"
                      value={boxName}
                      onChange={(e) => setBoxName(e.target.value)}
                      placeholder={t('boxNamePlaceholder')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">{t('description')}</Label>
                    <Textarea
                      id="description"
                      value={boxDescription}
                      onChange={(e) => setBoxDescription(e.target.value)}
                      placeholder={t('descriptionPlaceholder')}
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                    >
                      {t('cancel')}
                    </Button>
                    <Button
                      onClick={handleUpdateBox}
                      disabled={updateBoxMutation.isPending || !boxName.trim()}
                    >
                      {updateBoxMutation.isPending ? t('saving') : t('save')}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Prolonger la réservation */}
            {box.status === 'ACTIVE' && (
              <Dialog open={isExtending} onOpenChange={setIsExtending}>
                <DialogTrigger asChild>
                  <Button>
                    <Calendar className="h-4 w-4 mr-2" />
                    {t('extendReservation')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('extendReservation')}</DialogTitle>
                    <DialogDescription>
                      {t('extendReservationDescription')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="months">{t('additionalMonths')}</Label>
                      <Input
                        id="months"
                        type="number"
                        min="1"
                        max="12"
                        value={extensionMonths}
                        onChange={(e) => setExtensionMonths(parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex justify-between items-center">
                        <span>{t('additionalCost')}</span>
                        <span className="font-medium">
                          {(box.monthlyPrice * extensionMonths).toFixed(2)}€
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('newEndDate')}: {format(
                          new Date(new Date(box.endDate).getTime() + extensionMonths * 30 * 24 * 60 * 60 * 1000),
                          'dd MMMM yyyy',
                          { locale: fr }
                        )}
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsExtending(false)}
                      >
                        {t('cancel')}
                      </Button>
                      <Button
                        onClick={handleExtendReservation}
                        disabled={extendReservationMutation.isPending}
                      >
                        {extendReservationMutation.isPending ? t('processing') : t('extend')}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Annuler la réservation */}
            {box.status === 'ACTIVE' && (
              <Button
                variant="destructive"
                onClick={handleCancelReservation}
                disabled={cancelReservationMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('cancelReservation')}
              </Button>
            )}

            {/* Télécharger le contrat */}
            <Button
              variant="outline"
              onClick={() => window.open(`/api/contracts/box/${boxId}/download`, '_blank')}
            >
              <Download className="h-4 w-4 mr-2" />
              {t('downloadContract')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
