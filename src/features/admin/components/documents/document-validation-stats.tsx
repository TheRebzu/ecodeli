'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle,
  BarChart3
} from 'lucide-react'

interface ValidationStats {
  total: number
  pending: number
  approved: number
  rejected: number
  approvalRate: string
  byType: Record<string, {
    total: number
    pending: number
    approved: number
    rejected: number
  }>
}

interface DocumentValidationStatsProps {
  stats: ValidationStats | null
}

export function DocumentValidationStats({ stats }: DocumentValidationStatsProps) {
  if (!stats) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Aucune statistique disponible</p>
      </div>
    )
  }

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'IDENTITY': 'Pièces d\'identité',
      'DRIVING_LICENSE': 'Permis de conduire',
      'INSURANCE': 'Assurances',
      'VEHICLE_REGISTRATION': 'Cartes grises',
      'CERTIFICATION': 'Certifications',
      'OTHER': 'Autres'
    }
    return labels[type] || type
  }

  const getApprovalRate = (approved: number, total: number) => {
    if (total === 0) return 0
    return Math.round((approved / total) * 100)
  }

  const getStatusColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600'
    if (rate >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Vue d'ensemble */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total documents
                </p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  En attente
                </p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0}% du total
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Approuvés
                </p>
                <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Taux: {stats.approvalRate}%
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Rejetés
                </p>
                <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.total > 0 ? Math.round((stats.rejected / stats.total) * 100) : 0}% du total
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Taux d'approbation global */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Taux d'approbation global
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium">Approbation</span>
              <span className={`text-2xl font-bold ${getStatusColor(parseFloat(stats.approvalRate))}`}>
                {stats.approvalRate}%
              </span>
            </div>
            <Progress 
              value={parseFloat(stats.approvalRate)} 
              className="h-3"
            />
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Approuvés</p>
                <p className="text-lg font-semibold text-green-600">{stats.approved}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En attente</p>
                <p className="text-lg font-semibold text-yellow-600">{stats.pending}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rejetés</p>
                <p className="text-lg font-semibold text-red-600">{stats.rejected}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques par type de document */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Répartition par type de document
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(stats.byType).map(([type, data]) => {
              const approvalRate = getApprovalRate(data.approved, data.total)
              
              return (
                <div key={type} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">
                        {getDocumentTypeLabel(type)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {data.total} total
                      </Badge>
                    </div>
                    <span className={`font-semibold ${getStatusColor(approvalRate)}`}>
                      {approvalRate}%
                    </span>
                  </div>
                  
                  <Progress value={approvalRate} className="h-2" />
                  
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="text-center">
                      <p className="text-muted-foreground">Total</p>
                      <p className="font-medium">{data.total}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-green-600">Approuvés</p>
                      <p className="font-medium text-green-600">{data.approved}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-yellow-600">En attente</p>
                      <p className="font-medium text-yellow-600">{data.pending}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-red-600">Rejetés</p>
                      <p className="font-medium text-red-600">{data.rejected}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Métriques de performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Charge de travail</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Documents en attente</span>
                <Badge variant={stats.pending > 10 ? "destructive" : "secondary"}>
                  {stats.pending}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Backlog</span>
                <Badge variant={stats.pending > 20 ? "destructive" : stats.pending > 10 ? "secondary" : "default"}>
                  {stats.pending > 20 ? "Élevé" : stats.pending > 10 ? "Modéré" : "Faible"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Qualité de validation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Taux d'approbation</span>
                <Badge variant={parseFloat(stats.approvalRate) > 80 ? "default" : "secondary"}>
                  {stats.approvalRate}%
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Taux de rejet</span>
                <Badge variant="outline">
                  {stats.total > 0 ? Math.round((stats.rejected / stats.total) * 100) : 0}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}