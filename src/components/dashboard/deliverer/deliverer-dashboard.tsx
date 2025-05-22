'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Package2, Map, Truck, Bell, BarChart4 } from 'lucide-react';

interface DelivererDashboardProps {
  locale: string;
}

export default function DelivererDashboard({ locale }: DelivererDashboardProps) {
  const t = useTranslations('dashboard');
  const router = useRouter();

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
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">{t('welcome')}</h1>
        <p className="text-muted-foreground">{t('deliverer.welcomeMessage')}</p>
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
