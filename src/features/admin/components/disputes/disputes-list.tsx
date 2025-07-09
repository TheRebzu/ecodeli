'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle,
  Eye,
  MessageSquare,
  Calendar,
  User,
  Package
} from 'lucide-react'

interface Dispute {
  id: string
  title: string
  description: string
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  type: 'DELIVERY_ISSUE' | 'PAYMENT_DISPUTE' | 'SERVICE_QUALITY' | 'CANCELLATION' | 'OTHER'
  clientName: string
  delivererName: string
  deliveryId: string
  amount: number
  createdAt: string
  updatedAt: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
}

interface DisputesListProps {
  statusFilter: string
  searchTerm: string
  typeFilter: string
}

export function DisputesList({ statusFilter, searchTerm, typeFilter }: DisputesListProps) {
  const t = useTranslations('admin.disputes')
  const router = useRouter()
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: Fetch disputes with filters
    setDisputes([
      {
        id: '1',
        title: 'Livraison endommagée',
        description: 'Le colis est arrivé endommagé',
        status: 'OPEN',
        type: 'DELIVERY_ISSUE',
        clientName: 'Jean Dupont',
        delivererName: 'Marie Martin',
        deliveryId: 'DEL-001',
        amount: 25.50,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
        priority: 'HIGH'
      },
      {
        id: '2',
        title: 'Paiement non reçu',
        description: 'Le livreur n\'a pas reçu le paiement',
        status: 'IN_PROGRESS',
        type: 'PAYMENT_DISPUTE',
        clientName: 'Sophie Bernard',
        delivererName: 'Pierre Durand',
        deliveryId: 'DEL-002',
        amount: 45.00,
        createdAt: '2024-01-14T14:20:00Z',
        updatedAt: '2024-01-15T09:15:00Z',
        priority: 'MEDIUM'
      },
      {
        id: '3',
        title: 'Service de mauvaise qualité',
        description: 'Le service ne correspond pas aux attentes',
        status: 'RESOLVED',
        type: 'SERVICE_QUALITY',
        clientName: 'Lucas Moreau',
        delivererName: 'Emma Petit',
        deliveryId: 'DEL-003',
        amount: 30.00,
        createdAt: '2024-01-13T16:45:00Z',
        updatedAt: '2024-01-15T11:30:00Z',
        priority: 'LOW'
      }
    ])
    setLoading(false)
  }, [statusFilter, searchTerm, typeFilter])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="destructive">{t('open')}</Badge>
      case 'IN_PROGRESS':
        return <Badge variant="secondary">{t('inProgress')}</Badge>
      case 'RESOLVED':
        return <Badge variant="default">{t('resolved')}</Badge>
      case 'CLOSED':
        return <Badge variant="outline">{t('closed')}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return <Badge variant="destructive" className="text-xs">URGENT</Badge>
      case 'HIGH':
        return <Badge variant="destructive" className="text-xs">HIGH</Badge>
      case 'MEDIUM':
        return <Badge variant="secondary" className="text-xs">MEDIUM</Badge>
      case 'LOW':
        return <Badge variant="outline" className="text-xs">LOW</Badge>
      default:
        return <Badge variant="outline" className="text-xs">{priority}</Badge>
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'DELIVERY_ISSUE':
        return <Package className="h-4 w-4" />
      case 'PAYMENT_DISPUTE':
        return <AlertTriangle className="h-4 w-4" />
      case 'SERVICE_QUALITY':
        return <MessageSquare className="h-4 w-4" />
      case 'CANCELLATION':
        return <XCircle className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  if (disputes.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">{t('noDisputes')}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {disputes.map((dispute) => (
        <Card key={dispute.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  {getTypeIcon(dispute.type)}
                  <h3 className="font-semibold text-lg">{dispute.title}</h3>
                  {getPriorityBadge(dispute.priority)}
                </div>
                
                <p className="text-muted-foreground text-sm">
                  {dispute.description}
                </p>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{dispute.clientName}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    <span>#{dispute.deliveryId}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(dispute.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">€{dispute.amount}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {getStatusBadge(dispute.status)}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/admin/disputes/${dispute.id}`)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  {t('view')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 