'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Shield, 
  AlertTriangle, 
  MessageSquare, 
  Star,
  Flag,
  Ban,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  RefreshCw
} from 'lucide-react'
import { ModerationDashboard } from '@/features/admin/components/moderation/moderation-dashboard'
import { ContentReviewList } from '@/features/admin/components/moderation/content-review-list'
import { SanctionManager } from '@/features/admin/components/moderation/sanction-manager'

export default function AdminModerationPage() {
  const t = useTranslations('admin.moderation')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('refresh')}
        </Button>
      </div>

      {/* Dashboard Stats */}
      <ModerationDashboard />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('filters')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('statusFilter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allStatuses')}</SelectItem>
                <SelectItem value="PENDING">{t('pending')}</SelectItem>
                <SelectItem value="REVIEWED">{t('reviewed')}</SelectItem>
                <SelectItem value="APPROVED">{t('approved')}</SelectItem>
                <SelectItem value="REJECTED">{t('rejected')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('typeFilter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allTypes')}</SelectItem>
                <SelectItem value="ANNOUNCEMENT">{t('announcement')}</SelectItem>
                <SelectItem value="REVIEW">{t('review')}</SelectItem>
                <SelectItem value="COMMENT">{t('comment')}</SelectItem>
                <SelectItem value="USER_REPORT">{t('userReport')}</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => {
              setSearchTerm('')
              setStatusFilter('all')
              setTypeFilter('all')
            }}>
              {t('clearFilters')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Moderation Tabs */}
      <Tabs defaultValue="content" className="space-y-4">
        <TabsList>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            {t('contentReview')}
          </TabsTrigger>
          <TabsTrigger value="sanctions" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {t('sanctions')}
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <Flag className="h-4 w-4" />
            {t('reports')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content">
          <ContentReviewList 
            statusFilter={statusFilter}
            searchTerm={searchTerm}
            typeFilter={typeFilter}
          />
        </TabsContent>

        <TabsContent value="sanctions">
          <SanctionManager />
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{t('reports.description')}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 