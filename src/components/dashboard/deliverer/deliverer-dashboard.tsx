'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  Package2,
  Map,
  Truck,
  Bell,
  BarChart4,
  CheckCircle2,
  FileCheck,
  Home,
  Route,
  DollarSign,
  Activity
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSession } from 'next-auth/react';
import { Progress } from '@/components/ui/progress';
import { api } from '@/trpc/react';
import { ActiveDeliveries } from '@/components/dashboard/widgets/active-deliveries';
import { DelivererEarningsSummary } from '@/components/dashboard/widgets/deliverer-earnings-summary';
import { DelivererQuickActions } from '@/components/dashboard/widgets/deliverer-quick-actions';
import { DelivererRouteSuggestions } from '@/components/dashboard/widgets/deliverer-route-suggestions';

interface DelivererDashboardProps {
  locale: string;
}

// Interface pour les documents
interface Document {
  id: string;
  type: string;
  isVerified: boolean;
}

export default function DelivererDashboard({ locale }: DelivererDashboardProps) {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const { data: session } = useSession();
  const isVerified = session?.user?.isVerified;

  // Récupérer les documents de l'utilisateur via tRPC
  const { data: documentsData } = api.document.getUserDocuments.useQuery();
  // Récupérer les livraisons actives du livreur
  const { data: activeDeliveries, isLoading: isLoadingDeliveries } = api.delivery.getActiveDeliveries.useQuery();
  
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [isAvailable, setIsAvailable] = useState(false);
  const [pendingNotifications] = useState(3); // Mock data

  // Calculer la progression de la vérification
  useEffect(() => {
    if (documentsData) {
      // Compter les documents vérifiés
      const verifiedDocs = documentsData.filter((doc: Document) => doc.isVerified).length;
      // Nous avons besoin de 3 documents vérifiés
      const requiredDocs = 3;
      // Calculer le pourcentage de progression
      const progress = Math.min(100, (verifiedDocs / requiredDocs) * 100);
      setVerificationProgress(progress);
    }
  }, [documentsData]);

  // Définir les actions rapides pour les livreurs
  const quickActions = [
    {
      title: t('quickActions.findDeliveries'),
      description: t('quickActions.findDeliveriesDescription'),
      icon: <Package2 className="h-6 w-6" />,
      action: () => router.push(`/${locale}/deliverer/announcements`),
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    },
    {
      title: t('quickActions.manageRoutes'),
      description: t('quickActions.manageRoutesDescription'),
      icon: <Map className="h-6 w-6" />,
      action: () => router.push(`/${locale}/deliverer/my-routes`),
      color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    },
    {
      title: t('quickActions.activeDeliveries'),
      description: t('quickActions.activeDeliveriesDescription'),
      icon: <Truck className="h-6 w-6" />,
      action: () => router.push(`/${locale}/deliverer/deliveries/active`),
      color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    },
    {
      title: t('quickActions.schedule'),
      description: t('quickActions.scheduleDescription'),
      icon: <Calendar className="h-6 w-6" />,
      action: () => router.push(`/${locale}/deliverer/schedule`),
      color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    },
    {
      title: t('quickActions.notifications'),
      description: t('quickActions.notificationsDescription'),
      icon: <Bell className="h-6 w-6" />,
      action: () => router.push(`/${locale}/deliverer/notifications`),
      color: 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300',
    },
    {
      title: t('quickActions.statistics'),
      description: t('quickActions.statisticsDescription'),
      icon: <BarChart4 className="h-6 w-6" />,
      action: () => router.push(`/${locale}/deliverer/statistics`),
      color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
    },
  ];

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t('welcome')}</h1>
          {isVerified ? (
            <Badge
              variant="secondary"
              className="flex items-center gap-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{t('verification.verified')}</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="flex items-center gap-1">
              <span>{t('verification.pendingVerification')}</span>
            </Badge>
          )}
        </div>

        {!isVerified && (
          <Card className="mt-4 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileCheck className="h-4 w-4" />
                {t('verification.documentStatus')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs">
                    {verificationProgress === 100
                      ? t('verification.allDocumentsVerified')
                      : t('verification.documentsInVerification')}
                  </span>
                  <span className="text-xs font-medium">{Math.round(verificationProgress)}%</span>
                </div>
                <Progress value={verificationProgress} className="h-2" />
                {verificationProgress === 100 && !isVerified && (
                  <p className="text-xs text-muted-foreground">
                    {t('verification.processingVerification')}
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => router.push(`/${locale}/deliverer/documents`)}
                >
                  {t('verification.viewDocuments')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            {t('tabs.overview')}
          </TabsTrigger>
          <TabsTrigger value="deliveries" className="flex items-center gap-2">
            <Package2 className="h-4 w-4" />
            {t('tabs.deliveries')}
          </TabsTrigger>
          <TabsTrigger value="earnings" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            {t('tabs.earnings')}
          </TabsTrigger>
          <TabsTrigger value="routes" className="flex items-center gap-2">
            <Route className="h-4 w-4" />
            {t('tabs.routes')}
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            {t('tabs.activity')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Actions rapides */}
            <DelivererQuickActions 
              isAvailable={isAvailable}
              hasActiveDeliveries={activeDeliveries && activeDeliveries.length > 0}
              pendingNotifications={pendingNotifications}
            />
            
            {/* Livraisons actives */}
            <ActiveDeliveries 
              deliveries={activeDeliveries}
              isLoading={isLoadingDeliveries}
            />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Suggestions de trajets */}
            <DelivererRouteSuggestions />
            
            {/* Résumé des gains (version compacte) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  {t('earnings.quickSummary')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-600">45.50€</p>
                    <p className="text-xs text-muted-foreground">{t('earnings.today')}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">287.40€</p>
                    <p className="text-xs text-muted-foreground">{t('earnings.thisWeek')}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">1,156.80€</p>
                    <p className="text-xs text-muted-foreground">{t('earnings.thisMonth')}</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full mt-4" 
                  onClick={() => router.push(`/${locale}/deliverer/wallet`)}
                >
                  {t('earnings.viewDetails')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="deliveries" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Livraisons actives détaillées */}
            <ActiveDeliveries 
              deliveries={activeDeliveries}
              isLoading={isLoadingDeliveries}
            />
            
            {/* Annonces disponibles */}
            <Card>
              <CardHeader>
                <CardTitle>{t('availableDeliveries')}</CardTitle>
                <CardDescription>{t('availableDeliveriesDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex justify-center py-8">
                  <Button onClick={() => router.push(`/${locale}/deliverer/announcements`)}>
                    {t('actions.viewAllAnnouncements')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="earnings" className="space-y-6 mt-6">
          <DelivererEarningsSummary />
        </TabsContent>

        <TabsContent value="routes" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DelivererRouteSuggestions />
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5" />
                  {t('routes.myRoutes')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Map className="h-12 w-12 mx-auto text-muted-foreground opacity-25 mb-2" />
                  <p className="text-muted-foreground mb-4">{t('routes.noRoutesYet')}</p>
                  <Button onClick={() => router.push(`/${locale}/deliverer/my-routes/create`)}>
                    {t('routes.createFirstRoute')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action, index) => (
              <Card key={index} className="overflow-hidden">
                <CardHeader className={`${action.color} p-4 flex flex-row items-center gap-3`}>
                  {action.icon}
                  <div>
                    <CardTitle className="text-lg">{action.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <CardDescription className="text-sm mb-3">{action.description}</CardDescription>
                  <Button onClick={action.action} variant="default" size="sm" className="w-full">
                    {t('actions.viewMore')}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
