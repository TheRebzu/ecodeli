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
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSession } from 'next-auth/react';
import { Progress } from '@/components/ui/progress';
import { api } from '@/trpc/react';

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
  const [verificationProgress, setVerificationProgress] = useState(0);

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

      <Tabs defaultValue="quickActions" className="w-full">
        <TabsList>
          <TabsTrigger value="quickActions">{t('quickActions.title')}</TabsTrigger>
          <TabsTrigger value="announcements">{t('availableDeliveries')}</TabsTrigger>
          <TabsTrigger value="activeDeliveries">{t('activeDeliveries')}</TabsTrigger>
        </TabsList>

        <TabsContent value="quickActions" className="space-y-4 mt-4">
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

        <TabsContent value="announcements" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('availableDeliveries')}</CardTitle>
              <CardDescription>{t('availableDeliveriesDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {/* Ici, vous pouvez ajouter un component pour afficher les annonces disponibles */}
              <div className="flex justify-center py-8">
                <Button onClick={() => router.push(`/${locale}/deliverer/announcements`)}>
                  {t('actions.viewAllAnnouncements')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activeDeliveries" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('activeDeliveries')}</CardTitle>
              <CardDescription>{t('activeDeliveriesDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {/* Ici, vous pouvez ajouter un component pour afficher les livraisons actives */}
              <div className="flex justify-center py-8">
                <Button onClick={() => router.push(`/${locale}/deliverer/deliveries/active`)}>
                  {t('actions.viewActiveDeliveries')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
