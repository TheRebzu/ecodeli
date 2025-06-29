"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Search, Home, Scissors, Wrench, Heart, Users, BookOpen, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useToast } from '@/components/ui/use-toast'
import { useClientServices } from '../hooks/useClientServices'
import { ServiceRequest } from '../types/service.types'

const serviceTypes = [
  { value: 'HOME_CLEANING', label: 'Ménage', icon: Home, color: 'bg-blue-500' },
  { value: 'GARDENING', label: 'Jardinage', icon: Scissors, color: 'bg-green-500' },
  { value: 'HANDYMAN', label: 'Bricolage', icon: Wrench, color: 'bg-orange-500' },
  { value: 'PET_SITTING', label: 'Garde animaux', icon: Heart, color: 'bg-pink-500' },
  { value: 'PET_WALKING', label: 'Promenade', icon: Heart, color: 'bg-red-500' },
  { value: 'TUTORING', label: 'Cours particuliers', icon: BookOpen, color: 'bg-purple-500' },
  { value: 'BEAUTY_HOME', label: 'Soins esthétiques', icon: Sparkles, color: 'bg-violet-500' },
  { value: 'ELDERLY_CARE', label: 'Accompagnement', icon: Users, color: 'bg-indigo-500' }
]

const statusConfig = {
  DRAFT: { label: 'Brouillon', color: 'bg-gray-500', textColor: 'text-gray-600' },
  ACTIVE: { label: 'Active', color: 'bg-green-500', textColor: 'text-green-600' },
  BOOKED: { label: 'Réservée', color: 'bg-blue-500', textColor: 'text-blue-600' },
  IN_PROGRESS: { label: 'En cours', color: 'bg-yellow-500', textColor: 'text-yellow-600' },
  COMPLETED: { label: 'Terminée', color: 'bg-emerald-500', textColor: 'text-emerald-600' },
  CANCELLED: { label: 'Annulée', color: 'bg-red-500', textColor: 'text-red-600' }
}

const urgencyConfig = {
  LOW: { label: 'Pas pressé', color: 'bg-gray-100 text-gray-600' },
  NORMAL: { label: 'Normal', color: 'bg-blue-100 text-blue-600' },
  HIGH: { label: 'Urgent', color: 'bg-orange-100 text-orange-600' },
  URGENT: { label: 'Très urgent', color: 'bg-red-100 text-red-600' }
}

export function ServiceRequestsManager() {
  const [filteredRequests, setFilteredRequests] = useState<ServiceRequest[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [activeTab, setActiveTab] = useState('all')
  
  const router = useRouter()
  const t = useTranslations('services')
  const { toast } = useToast()
  const { serviceRequests, isLoading, deleteServiceRequest } = useClientServices()

  useEffect(() => {
    let filtered = serviceRequests

    if (activeTab !== 'all') {
      filtered = filtered.filter(s => {
        switch (activeTab) {
          case 'active': return ['ACTIVE', 'BOOKED'].includes(s.status)
          case 'progress': return s.status === 'IN_PROGRESS'
          case 'completed': return s.status === 'COMPLETED'
          case 'drafts': return s.status === 'DRAFT'
          default: return true
        }
      })
    }

    if (searchTerm) {
      filtered = filtered.filter(s => 
        s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(s => s.serviceType === selectedType)
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(s => s.status === selectedStatus)
    }

    setFilteredRequests(filtered)
  }, [serviceRequests, searchTerm, selectedType, selectedStatus, activeTab])

  const getServiceTypeInfo = (type: string) => {
    return serviceTypes.find(t => t.value === type) || serviceTypes[0]
  }

  const handleDeleteServiceRequest = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return

    try {
      await deleteServiceRequest(id)
      toast({
        title: t("deleteSuccess"),
        description: t("deleteSuccessDesc"),
      })
    } catch (error) {
      toast({
        title: t("deleteError"),
        description: t("deleteErrorDesc"),
        variant: "destructive",
      })
    }
  }

  const ServiceRequestCard = ({ serviceRequest }: { serviceRequest: ServiceRequest }) => {
    const typeInfo = getServiceTypeInfo(serviceRequest.serviceType)
    const statusInfo = statusConfig[serviceRequest.status as keyof typeof statusConfig]
    const urgencyInfo = urgencyConfig[serviceRequest.urgency as keyof typeof urgencyConfig]
    const Icon = typeInfo.icon

    return (
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${typeInfo.color} flex items-center justify-center`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg leading-6">{serviceRequest.title}</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {serviceRequest.location?.city} • {serviceRequest.estimatedDuration} min
                </p>
              </div>
            </div>
            <div className="text-right">
              <Badge className={statusInfo.color}>
                {statusInfo.label}
              </Badge>
              {serviceRequest.urgency !== 'NORMAL' && (
                <Badge className={`ml-2 ${urgencyInfo.color}`}>
                  {urgencyInfo.label}
                </Badge>
              )}
              {serviceRequest.isRecurring && (
                <Badge variant="outline" className="ml-2">🔄 {t('recurring')}</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <p className="text-gray-700 mb-4 line-clamp-2">{serviceRequest.description}</p>
          
          <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
            <span>{t('budget')}: <strong>{serviceRequest.budget}€</strong></span>
            <span>{t('scheduledFor')}: {new Date(serviceRequest.scheduledAt).toLocaleDateString()}</span>
          </div>
          
          <div className="flex gap-2 pt-3 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => router.push(`/client/service-requests/${serviceRequest.id}`)}
              className="flex-1"
            >
              👁️ {t('viewDetails')}
            </Button>
            
            {serviceRequest.status === 'DRAFT' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push(`/client/service-requests/${serviceRequest.id}/edit`)}
              >
                ✏️ {t('edit')}
              </Button>
            )}
            
            {['DRAFT', 'ACTIVE'].includes(serviceRequest.status) && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => handleDeleteServiceRequest(serviceRequest.id)}
              >
                🗑️
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🛠️ {t('title')}</h1>
          <p className="text-gray-600">{t('subtitle')}</p>
        </div>
        <Button onClick={() => router.push('/client/service-requests/create')} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          {t('newRequest')}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(statusConfig).map(([status, config]) => {
          const count = serviceRequests.filter(s => s.status === status).length
          return (
            <Card key={status}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{count}</p>
                <p className={`text-sm ${config.textColor}`}>{config.label}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={t('searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder={t('allTypes')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allTypes')}</SelectItem>
                {serviceTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder={t('allStatuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allStatuses')}</SelectItem>
                {Object.entries(statusConfig).map(([status, config]) => (
                  <SelectItem key={status} value={status}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">{t('all')} ({serviceRequests.length})</TabsTrigger>
          <TabsTrigger value="active">{t('active')} ({serviceRequests.filter(s => ['ACTIVE', 'BOOKED'].includes(s.status)).length})</TabsTrigger>
          <TabsTrigger value="progress">{t('inProgress')} ({serviceRequests.filter(s => s.status === 'IN_PROGRESS').length})</TabsTrigger>
          <TabsTrigger value="completed">{t('completed')} ({serviceRequests.filter(s => s.status === 'COMPLETED').length})</TabsTrigger>
          <TabsTrigger value="drafts">{t('drafts')} ({serviceRequests.filter(s => s.status === 'DRAFT').length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Wrench className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t('noRequestsFound')}</h3>
                <p className="text-gray-600 mb-4">
                  {activeTab === 'all' && !searchTerm && !selectedType && !selectedStatus
                    ? t('noRequestsYet')
                    : t('noMatchingRequests')
                  }
                </p>
                <Button onClick={() => router.push('/client/service-requests/create')}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('createFirstRequest')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredRequests.map(serviceRequest => (
                <ServiceRequestCard key={serviceRequest.id} serviceRequest={serviceRequest} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}