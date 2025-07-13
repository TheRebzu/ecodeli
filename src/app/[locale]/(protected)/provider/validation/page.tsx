'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/auth-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { useProviderValidation } from '@/features/provider/hooks/use-provider-validation'
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  FileText, 
  Award, 
  Shield, 
  User,
  Upload,
  Download,
  Eye,
  Loader2,
  ArrowRight,
  RefreshCw,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Building,
  Star,
  TrendingUp
} from 'lucide-react'

interface ValidationStepProps {
  step: any
  isActive: boolean
  isCompleted: boolean
  onAction?: () => void
}

function ValidationStepCard({ step, isActive, isCompleted, onAction }: ValidationStepProps) {
  const getStepIcon = () => {
    if (isCompleted) return <CheckCircle className="h-5 w-5 text-green-500" />
    if (step.status === 'failed') return <AlertCircle className="h-5 w-5 text-red-500" />
    if (isActive) return <Clock className="h-5 w-5 text-blue-500" />
    return <Clock className="h-5 w-5 text-muted-foreground" />
  }

  const getStepStatus = () => {
    if (isCompleted) return 'Terminé'
    if (step.status === 'failed') return 'Échec'
    if (isActive) return 'En cours'
    return 'En attente'
  }

  return (
    <Card className={`transition-all ${isActive ? 'ring-2 ring-blue-500' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStepIcon()}
            <div>
              <CardTitle className="text-lg">{step.title}</CardTitle>
              <Badge variant={
                isCompleted ? 'default' : 
                step.status === 'failed' ? 'destructive' : 
                isActive ? 'secondary' : 'outline'
              }>
                {getStepStatus()}
              </Badge>
            </div>
          </div>
          {step.completedAt && (
            <div className="text-sm text-muted-foreground">
              {new Date(step.completedAt).toLocaleDateString()}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">{step.description}</p>
        
        {step.status === 'failed' && step.errorMessage && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{step.errorMessage}</AlertDescription>
          </Alert>
        )}
        
        {isActive && onAction && (
          <Button onClick={onAction} className="w-full">
            <ArrowRight className="h-4 w-4 mr-2" />
            Continuer cette étape
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

interface CertificationCardProps {
  certification: any
  onStart: () => void
  onView: () => void
}

function CertificationCard({ certification, onStart, onView }: CertificationCardProps) {
  const getStatusColor = () => {
    switch (certification.status) {
      case 'completed': return 'text-green-600'
      case 'in_progress': return 'text-blue-600'
      case 'failed': return 'text-red-600'
      default: return 'text-muted-foreground'
    }
  }

  const getStatusText = () => {
    switch (certification.status) {
      case 'completed': return 'Certifié'
      case 'in_progress': return 'En cours'
      case 'failed': return 'Échec'
      case 'expired': return 'Expiré'
      default: return 'Non commencé'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Award className="h-6 w-6 text-yellow-500" />
            <div>
              <CardTitle className="text-lg">{certification.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={certification.isRequired ? 'default' : 'secondary'}>
                  {certification.isRequired ? 'Obligatoire' : 'Optionnelle'}
                </Badge>
                <Badge variant="outline" className={getStatusColor()}>
                  {getStatusText()}
                </Badge>
              </div>
            </div>
          </div>
          
          {certification.status === 'completed' && certification.certificateUrl && (
            <Button variant="outline" size="sm" onClick={onView}>
              <Eye className="h-4 w-4 mr-2" />
              Voir certificat
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <p className="text-muted-foreground mb-4">{certification.description}</p>
        
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span>Catégorie:</span>
            <span className="font-medium">{certification.category}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Niveau:</span>
            <span className="font-medium">{certification.level}</span>
          </div>
          {certification.score && (
            <div className="flex justify-between text-sm">
              <span>Score obtenu:</span>
              <span className="font-medium">{certification.score}%</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span>Tentatives:</span>
            <span className="font-medium">{certification.attempts}/{certification.maxAttempts}</span>
          </div>
        </div>

        {certification.expiresAt && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Calendar className="h-4 w-4" />
            <span>Expire le {new Date(certification.expiresAt).toLocaleDateString()}</span>
          </div>
        )}

        {certification.status === 'not_started' && (
          <Button onClick={onStart} className="w-full">
            <Award className="h-4 w-4 mr-2" />
            Commencer la certification
          </Button>
        )}
        
        {certification.status === 'in_progress' && (
          <Button onClick={onView} variant="outline" className="w-full">
            <ArrowRight className="h-4 w-4 mr-2" />
            Continuer la formation
          </Button>
        )}
        
        {certification.status === 'failed' && certification.attempts < certification.maxAttempts && (
          <Button onClick={onStart} variant="outline" className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reprendre la certification
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export default function ProviderValidationPage() {
  const t = useTranslations('provider.validation')
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  
  const {
    validationStatus,
    isLoading,
    error,
    requiredCertifications,
    certificationsLoading,
    refreshStatus,
    startCertification,
    currentStep,
    nextStep,
    canProceed,
    progressPercentage
  } = useProviderValidation(user?.id)

  // Rafraîchir le statut au montage
  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
        <Button variant="outline" onClick={refreshStatus}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('refresh')}
        </Button>
      </div>

      {/* Barre de progression globale */}
      {validationStatus && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {t('progress.title')}
                </CardTitle>
                <CardDescription>
                  {t('progress.description')}
                </CardDescription>
              </div>
              <Badge variant={
                validationStatus.currentStatus === 'APPROVED' ? 'default' :
                validationStatus.currentStatus === 'REJECTED' ? 'destructive' :
                'secondary'
              }>
                {validationStatus.currentStatus}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>{t('progress.completion')}</span>
                  <span>{progressPercentage}%</span>
                </div>
                <Progress value={progressPercentage} className="w-full" />
              </div>
              
              {validationStatus.estimatedCompletionDate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {t('progress.estimated')}: {new Date(validationStatus.estimatedCompletionDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              
              {validationStatus.nextAction && (
                <Alert>
                  <ArrowRight className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{t('progress.nextAction')}:</strong> {validationStatus.nextAction}
                  </AlertDescription>
                </Alert>
              )}
              
              {validationStatus.rejectionReason && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{t('progress.rejectionReason')}:</strong> {validationStatus.rejectionReason}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {t('tabs.overview')}
          </TabsTrigger>
          <TabsTrigger value="steps" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            {t('tabs.steps')}
          </TabsTrigger>
          <TabsTrigger value="certifications" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            {t('tabs.certifications')}
          </TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('stats.status')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {validationStatus?.currentStatus || 'PENDING'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('stats.statusDesc')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('stats.progress')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{progressPercentage}%</div>
                <p className="text-xs text-muted-foreground">
                  {t('stats.progressDesc')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('stats.certifications')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {requiredCertifications.filter(c => c.status === 'completed').length}/
                  {requiredCertifications.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('stats.certificationsDesc')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('stats.documents')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {validationStatus?.steps.find(s => s.id === 'documents')?.status === 'completed' ? '✓' : '○'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('stats.documentsDesc')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Étape actuelle */}
          {currentStep && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {t('current.title')}
                </CardTitle>
                <CardDescription>
                  {t('current.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">{currentStep.title}</h3>
                    <p className="text-muted-foreground">{currentStep.description}</p>
                  </div>
                  
                  {currentStep.id === 'documents' && (
                    <Button className="w-full">
                      <Upload className="h-4 w-4 mr-2" />
                      {t('current.uploadDocuments')}
                    </Button>
                  )}
                  
                  {currentStep.id === 'certifications' && (
                    <Button 
                      className="w-full"
                      onClick={() => setActiveTab('certifications')}
                    >
                      <Award className="h-4 w-4 mr-2" />
                      {t('current.startCertifications')}
                    </Button>
                  )}
                  
                  {currentStep.id === 'admin_review' && (
                    <Alert>
                      <Clock className="h-4 w-4" />
                      <AlertDescription>
                        {t('current.adminReview')}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Étapes détaillées */}
        <TabsContent value="steps" className="space-y-6">
          <div className="grid gap-4">
            {validationStatus?.steps.map((step, index) => {
              const isActive = currentStep?.id === step.id
              const isCompleted = step.status === 'completed'
              
              return (
                <ValidationStepCard
                  key={step.id}
                  step={step}
                  isActive={isActive}
                  isCompleted={isCompleted}
                  onAction={() => {
                    if (step.id === 'certifications') {
                      setActiveTab('certifications')
                    }
                  }}
                />
              )
            })}
          </div>
        </TabsContent>

        {/* Certifications */}
        <TabsContent value="certifications" className="space-y-6">
          {certificationsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="grid gap-4">
              {requiredCertifications.map((certification) => (
                <CertificationCard
                  key={certification.id}
                  certification={certification}
                  onStart={() => startCertification(certification.id)}
                  onView={() => {
                    // Naviguer vers la page de certification
                    window.location.href = `/provider/certifications/${certification.id}`
                  }}
                />
              ))}
              
              {requiredCertifications.length === 0 && (
                <Card>
                  <CardContent className="text-center py-8">
                    <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold mb-2">{t('certifications.empty.title')}</h3>
                    <p className="text-muted-foreground">{t('certifications.empty.description')}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}