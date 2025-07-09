'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle,
  XCircle,
  AlertTriangle,
  DollarSign,
  MessageSquare
} from 'lucide-react'

interface DisputeResolutionFormProps {
  disputeId: string
  onResolved: () => void
}

export function DisputeResolutionForm({ disputeId, onResolved }: DisputeResolutionFormProps) {
  const t = useTranslations('admin.disputes')
  const [resolutionType, setResolutionType] = useState('')
  const [resolution, setResolution] = useState('')
  const [compensation, setCompensation] = useState('')
  const [sanction, setSanction] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!resolutionType || !resolution) return

    setLoading(true)
    
    try {
      // TODO: Submit resolution
      console.log('Submitting resolution:', {
        disputeId,
        resolutionType,
        resolution,
        compensation,
        sanction
      })
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      onResolved()
    } catch (error) {
      console.error('Error submitting resolution:', error)
    } finally {
      setLoading(false)
    }
  }

  const getResolutionIcon = (type: string) => {
    switch (type) {
      case 'RESOLVED_CLIENT_FAVOR':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'RESOLVED_DELIVERER_FAVOR':
        return <CheckCircle className="h-4 w-4 text-blue-500" />
      case 'PARTIAL_RESOLUTION':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-4">
      {/* Resolution Type */}
      <div className="space-y-2">
        <label className="text-sm font-medium">{t('resolutionType')}</label>
        <Select value={resolutionType} onValueChange={setResolutionType}>
          <SelectTrigger>
            <SelectValue placeholder={t('selectResolutionType')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="RESOLVED_CLIENT_FAVOR">
              <div className="flex items-center gap-2">
                {getResolutionIcon('RESOLVED_CLIENT_FAVOR')}
                {t('resolvedClientFavor')}
              </div>
            </SelectItem>
            <SelectItem value="RESOLVED_DELIVERER_FAVOR">
              <div className="flex items-center gap-2">
                {getResolutionIcon('RESOLVED_DELIVERER_FAVOR')}
                {t('resolvedDelivererFavor')}
              </div>
            </SelectItem>
            <SelectItem value="PARTIAL_RESOLUTION">
              <div className="flex items-center gap-2">
                {getResolutionIcon('PARTIAL_RESOLUTION')}
                {t('partialResolution')}
              </div>
            </SelectItem>
            <SelectItem value="CANCELLED">
              <div className="flex items-center gap-2">
                {getResolutionIcon('CANCELLED')}
                {t('cancelled')}
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Resolution Details */}
      <div className="space-y-2">
        <label className="text-sm font-medium">{t('resolutionDetails')}</label>
        <Textarea
          placeholder={t('resolutionDetailsPlaceholder')}
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          rows={4}
        />
      </div>

      {/* Compensation */}
      {resolutionType && resolutionType !== 'CANCELLED' && (
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            {t('compensation')}
          </label>
          <Select value={compensation} onValueChange={setCompensation}>
            <SelectTrigger>
              <SelectValue placeholder={t('selectCompensation')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FULL_REFUND">{t('fullRefund')}</SelectItem>
              <SelectItem value="PARTIAL_REFUND">{t('partialRefund')}</SelectItem>
              <SelectItem value="CREDIT">{t('credit')}</SelectItem>
              <SelectItem value="NONE">{t('noCompensation')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Sanctions */}
      <div className="space-y-2">
        <label className="text-sm font-medium">{t('sanctions')}</label>
        <Select value={sanction} onValueChange={setSanction}>
          <SelectTrigger>
            <SelectValue placeholder={t('selectSanction')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="WARNING">{t('warning')}</SelectItem>
            <SelectItem value="SUSPENSION">{t('suspension')}</SelectItem>
            <SelectItem value="BAN">{t('ban')}</SelectItem>
            <SelectItem value="NONE">{t('noSanction')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Submit Button */}
      <Button 
        onClick={handleSubmit}
        disabled={!resolutionType || !resolution || loading}
        className="w-full"
      >
        {loading ? t('submitting') : t('submitResolution')}
      </Button>

      {/* Preview */}
      {resolutionType && resolution && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-sm">{t('resolutionPreview')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              {getResolutionIcon(resolutionType)}
              <Badge variant="outline">
                {t(resolutionType.toLowerCase())}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground">
              {resolution}
            </p>
            
            {compensation && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {t('compensation')}: {t(compensation.toLowerCase())}
                </span>
              </div>
            )}
            
            {sanction && sanction !== 'NONE' && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {t('sanction')}: {t(sanction.toLowerCase())}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
} 