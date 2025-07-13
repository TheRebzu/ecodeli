'use client'

import { useState, useEffect } from 'react'
import { useAnnouncements } from '@/features/announcements/hooks/useAnnouncements'
import { AnnouncementCard } from '../shared/announcement-card'
import { AnnouncementFilters } from '../shared/announcement-filters'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Filter, Search } from 'lucide-react'
// Define types locally to avoid Prisma client import on client side
type AnnouncementType = 'PACKAGE_DELIVERY' | 'PERSON_TRANSPORT' | 'AIRPORT_TRANSFER' | 'SHOPPING' | 'INTERNATIONAL_PURCHASE' | 'PET_SITTING' | 'HOME_SERVICE' | 'CART_DROP';
type AnnouncementStatus = 'DRAFT' | 'ACTIVE' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

interface AnnouncementListProps {
  showCreateButton?: boolean
  showFilters?: boolean
  compactView?: boolean
}

export function AnnouncementList({ 
  showCreateButton = true, 
  showFilters = true,
  compactView = false 
}: AnnouncementListProps) {
  const t = useTranslations('announcements')
  const router = useRouter()
  
  const [filters, setFilters] = useState({
    page: 1,
    limit: compactView ? 5 : 10,
    type: undefined as AnnouncementType | undefined,
    status: undefined as AnnouncementStatus | undefined,
    urgent: undefined as boolean | undefined,
    search: ''
  })

  const { 
    announcements, 
    isLoading, 
    error, 
    pagination,
    refresh
  } = useAnnouncements(filters)

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }))
  }

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }))
  }

  const handleCreateNew = () => {
    router.push('/client/announcements/create')
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <p>{t('error.loading')}</p>
            <Button onClick={refresh} variant="outline" className="mt-2">
              {t('actions.retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{t('title.myAnnouncements')}</h2>
          <p className="text-muted-foreground">
            {t('description.manageYourAnnouncements')}
          </p>
        </div>
        {showCreateButton && (
          <Button onClick={handleCreateNew} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t('actions.createNew')}
          </Button>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              {t('filters.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('filters.search')}
                  value={filters.search}
                  onChange={(e) => handleFilterChange({ search: e.target.value })}
                  className="pl-10"
                />
              </div>

              {/* Type Filter */}
              <Select value={filters.type || ''} onValueChange={(value) => 
                handleFilterChange({ type: value as AnnouncementType || undefined })
              }>
                <SelectTrigger>
                  <SelectValue placeholder={t('filters.type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('filters.allTypes')}</SelectItem>
                  <SelectItem value="PACKAGE_DELIVERY">{t('types.packageDelivery')}</SelectItem>
                  <SelectItem value="PERSON_TRANSPORT">{t('types.personTransport')}</SelectItem>
                  <SelectItem value="AIRPORT_TRANSFER">{t('types.airportTransfer')}</SelectItem>
                  <SelectItem value="SHOPPING">{t('types.shopping')}</SelectItem>
                  <SelectItem value="INTERNATIONAL_PURCHASE">{t('types.internationalPurchase')}</SelectItem>
                  <SelectItem value="PET_SITTING">{t('types.petSitting')}</SelectItem>
                  <SelectItem value="HOME_SERVICE">{t('types.homeService')}</SelectItem>
                  <SelectItem value="CART_DROP">{t('types.cartDrop')}</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={filters.status || ''} onValueChange={(value) => 
                handleFilterChange({ status: value as AnnouncementStatus || undefined })
              }>
                <SelectTrigger>
                  <SelectValue placeholder={t('filters.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('filters.allStatuses')}</SelectItem>
                  <SelectItem value="DRAFT">{t('status.draft')}</SelectItem>
                  <SelectItem value="ACTIVE">{t('status.active')}</SelectItem>
                  <SelectItem value="IN_PROGRESS">{t('status.inProgress')}</SelectItem>
                  <SelectItem value="COMPLETED">{t('status.completed')}</SelectItem>
                  <SelectItem value="CANCELLED">{t('status.cancelled')}</SelectItem>
                  <SelectItem value="EXPIRED">{t('status.expired')}</SelectItem>
                </SelectContent>
              </Select>

              {/* Urgent Filter */}
              <Select value={filters.urgent?.toString() || ''} onValueChange={(value) => 
                handleFilterChange({ urgent: value === 'true' ? true : value === 'false' ? false : undefined })
              }>
                <SelectTrigger>
                  <SelectValue placeholder={t('filters.urgency')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('filters.allUrgencies')}</SelectItem>
                  <SelectItem value="true">{t('filters.urgentOnly')}</SelectItem>
                  <SelectItem value="false">{t('filters.normalOnly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      {pagination && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <Badge variant="outline">
            {t('stats.total', { count: pagination.total })}
          </Badge>
          <Badge variant="outline">
            {t('stats.page', { current: pagination.page, total: pagination.totalPages })}
          </Badge>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: filters.limit }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Announcements List */}
      {!isLoading && announcements && (
        <>
          {announcements.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="space-y-4">
                  <div className="text-4xl">📢</div>
                  <div>
                    <h3 className="text-lg font-medium">{t('empty.title')}</h3>
                    <p className="text-muted-foreground">{t('empty.description')}</p>
                  </div>
                  {showCreateButton && (
                    <Button onClick={handleCreateNew} className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      {t('actions.createFirst')}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <AnnouncementCard
                  key={announcement.id}
                  announcement={announcement}
                  variant="client"
                  compact={compactView}
                  onView={() => router.push(`/client/announcements/${announcement.id}`)}
                  onEdit={() => router.push(`/client/announcements/${announcement.id}/edit`)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-center items-center gap-2">
                  <Button
                    disabled={!pagination.hasPrev}
                    onClick={() => handlePageChange(pagination.page - 1)}
                    variant="outline"
                    size="sm"
                  >
                    {t('pagination.previous')}
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      const page = i + 1
                      return (
                        <Button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          variant={page === pagination.page ? "default" : "outline"}
                          size="sm"
                        >
                          {page}
                        </Button>
                      )
                    })}
                  </div>

                  <Button
                    disabled={!pagination.hasNext}
                    onClick={() => handlePageChange(pagination.page + 1)}
                    variant="outline"
                    size="sm"
                  >
                    {t('pagination.next')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}