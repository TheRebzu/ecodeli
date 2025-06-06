'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { format, addDays } from 'date-fns';
import {
  RefreshCw,
  Settings,
  Save,
  Calendar as CalendarIcon,
  CreditCard,
  Toggle,
  AlertCircle,
  Check,
  CheckCircle,
  Clock,
  BarChart4,
  Bell,
  Mail,
  Wallet,
  FileUp,
  Sliders,
  Info,
} from 'lucide-react';

import { api } from '@/trpc/react';
import { useToast } from '@/components/ui/use-toast';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Import du composant de tableau de bord de facturation
import BillingDashboard from '@/components/admin/financial/billing-dashboard';

/**
 * Page d'administration de la facturation
 * Centre de contrôle pour la facturation automatique et les opérations financières
 */
export default function AdminBillingPage() {
  const t = useTranslations('admin.billing');
  const { data: session } = useSession();
  const { toast } = useToast();

  // États pour les paramètres de facturation
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [billingSettings, setBillingSettings] = useState({
    autoBillingEnabled: true,
    billingDay: 1,
    paymentGracePeriod: 15,
    remindersEnabled: true,
    reminderDays: [3, 7, 1],
    autoPayoutsEnabled: true,
    minPayoutAmount: 50,
    taxRate: 20,
    demoMode: true,
    currencyCode: 'EUR',
    emailNotifications: true,
    autoSendInvoices: true,
    autoProcessSubscriptions: true,
    invoicePrefix: 'ECO',
    invoiceNumberFormat: 'ECO-{YEAR}{MONTH}-{NUMBER}',
    invoiceLogoUrl: '/images/logo.png',
  });

  // Récupérer les paramètres de facturation
  const {
    data: settings,
    isLoading: isLoadingSettings,
    refetch: refetchSettings,
  } = api.billing.getBillingSettings.useQuery(undefined, {
    refetchOnWindowFocus: false,
    onSuccess: data => {
      if (data) {
        setBillingSettings(data);
      }
    },
  });

  // Mutation pour mettre à jour les paramètres de facturation
  const updateSettingsMutation = api.billing.updateBillingSettings.useMutation({
    onSuccess: () => {
      toast({
        title: t('settingsUpdated'),
        description: t('settingsUpdatedSuccess'),
      });
      setIsEditingSettings(false);
      refetchSettings();
    },
    onError: error => {
      toast({
        variant: 'destructive',
        title: t('updateFailed'),
        description: error.message || t('genericError'),
      });
    },
  });

  // Rafraîchir les données
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetchSettings();
      toast({
        title: t('refreshSuccess'),
        description: t('dataRefreshed'),
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('refreshError'),
        description: typeof error === 'string' ? error : t('genericError'),
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Sauvegarder les paramètres
  const handleSaveSettings = async () => {
    try {
      await updateSettingsMutation.mutateAsync(billingSettings);
    } catch (error) {
      // Erreur déjà gérée par la mutation
    }
  };

  // Annuler les modifications
  const handleCancelEdit = () => {
    // Restaurer les paramètres d'origine
    if (settings) {
      setBillingSettings(settings);
    }
    setIsEditingSettings(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        action={
          currentTab === 'settings' &&
          (isEditingSettings ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleCancelEdit}>
                {t('cancel')}
              </Button>
              <Button onClick={handleSaveSettings}>
                <Save className="h-4 w-4 mr-2" />
                {t('saveSettings')}
              </Button>
            </div>
          ) : (
            <Button onClick={() => setIsEditingSettings(true)}>
              <Settings className="h-4 w-4 mr-2" />
              {t('editSettings')}
            </Button>
          ))
        }
      />

      <Tabs defaultValue="dashboard" value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="dashboard">
            <BarChart4 className="h-4 w-4 mr-2" />
            {t('dashboard')}
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            {t('settings')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Tableau de bord de facturation */}
          <BillingDashboard />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          {/* Paramètres de facturation */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Paramètres généraux */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sliders className="h-5 w-5" />
                  {t('generalSettings')}
                </CardTitle>
                <CardDescription>{t('generalSettingsDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingSettings ? (
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="billingDay">{t('billingDay')}</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="billingDay"
                          type="number"
                          min="1"
                          max="28"
                          value={billingSettings.billingDay}
                          onChange={e =>
                            setBillingSettings({
                              ...billingSettings,
                              billingDay: parseInt(e.target.value),
                            })
                          }
                          disabled={!isEditingSettings}
                        />
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="w-80 text-sm">{t('billingDayTooltip')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="paymentGracePeriod">{t('paymentGracePeriod')}</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="paymentGracePeriod"
                          type="number"
                          min="1"
                          max="30"
                          value={billingSettings.paymentGracePeriod}
                          onChange={e =>
                            setBillingSettings({
                              ...billingSettings,
                              paymentGracePeriod: parseInt(e.target.value),
                            })
                          }
                          disabled={!isEditingSettings}
                        />
                        <span>{t('days')}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t('paymentGracePeriodDescription')}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="currencyCode">{t('currency')}</Label>
                      <Select
                        value={billingSettings.currencyCode}
                        onValueChange={value =>
                          setBillingSettings({
                            ...billingSettings,
                            currencyCode: value,
                          })
                        }
                        disabled={!isEditingSettings}
                      >
                        <SelectTrigger id="currencyCode">
                          <SelectValue placeholder={t('selectCurrency')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="USD">USD - Dollar américain</SelectItem>
                          <SelectItem value="GBP">GBP - Livre sterling</SelectItem>
                          <SelectItem value="CHF">CHF - Franc suisse</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="taxRate">{t('defaultTaxRate')}</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="taxRate"
                          type="number"
                          min="0"
                          max="30"
                          value={billingSettings.taxRate}
                          onChange={e =>
                            setBillingSettings({
                              ...billingSettings,
                              taxRate: parseFloat(e.target.value),
                            })
                          }
                          disabled={!isEditingSettings}
                        />
                        <span>%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="demoMode" className="cursor-pointer">
                        {t('demoMode')}
                      </Label>
                      <Switch
                        id="demoMode"
                        checked={billingSettings.demoMode}
                        onCheckedChange={checked =>
                          setBillingSettings({
                            ...billingSettings,
                            demoMode: checked,
                          })
                        }
                        disabled={!isEditingSettings}
                      />
                    </div>
                    {billingSettings.demoMode && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>{t('demoModeActive')}</AlertTitle>
                        <AlertDescription>{t('demoModeDescription')}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Automatisation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {t('automationSettings')}
                </CardTitle>
                <CardDescription>{t('automationSettingsDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingSettings ? (
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{t('autoBilling')}</p>
                        <p className="text-sm text-muted-foreground">
                          {t('autoBillingDescription')}
                        </p>
                      </div>
                      <Switch
                        checked={billingSettings.autoBillingEnabled}
                        onCheckedChange={checked =>
                          setBillingSettings({
                            ...billingSettings,
                            autoBillingEnabled: checked,
                          })
                        }
                        disabled={!isEditingSettings}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{t('automaticReminders')}</p>
                        <p className="text-sm text-muted-foreground">
                          {t('automaticRemindersDescription')}
                        </p>
                      </div>
                      <Switch
                        checked={billingSettings.remindersEnabled}
                        onCheckedChange={checked =>
                          setBillingSettings({
                            ...billingSettings,
                            remindersEnabled: checked,
                          })
                        }
                        disabled={!isEditingSettings}
                      />
                    </div>

                    {billingSettings.remindersEnabled && (
                      <div className="pl-4 border-l-2 border-muted space-y-2">
                        <p className="text-sm font-medium">{t('reminderDays')}</p>
                        <div className="flex flex-wrap gap-2">
                          {billingSettings.reminderDays.map((day, index) => (
                            <Badge key={index} variant="outline">
                              {day === 1 ? t('dayBeforeDue') : t('daysBeforeDue', { count: day })}
                            </Badge>
                          ))}
                          {isEditingSettings && (
                            <Button variant="ghost" size="sm" className="h-6">
                              {t('edit')}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{t('automaticPayouts')}</p>
                        <p className="text-sm text-muted-foreground">
                          {t('automaticPayoutsDescription')}
                        </p>
                      </div>
                      <Switch
                        checked={billingSettings.autoPayoutsEnabled}
                        onCheckedChange={checked =>
                          setBillingSettings({
                            ...billingSettings,
                            autoPayoutsEnabled: checked,
                          })
                        }
                        disabled={!isEditingSettings}
                      />
                    </div>

                    {billingSettings.autoPayoutsEnabled && (
                      <div className="pl-4 border-l-2 border-muted space-y-2">
                        <Label htmlFor="minPayoutAmount" className="text-sm font-medium">
                          {t('minimumPayoutAmount')}
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="minPayoutAmount"
                            type="number"
                            min="10"
                            value={billingSettings.minPayoutAmount}
                            onChange={e =>
                              setBillingSettings({
                                ...billingSettings,
                                minPayoutAmount: parseFloat(e.target.value),
                              })
                            }
                            disabled={!isEditingSettings}
                          />
                          <span>{billingSettings.currencyCode}</span>
                        </div>
                      </div>
                    )}

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{t('autoSendInvoices')}</p>
                        <p className="text-sm text-muted-foreground">
                          {t('autoSendInvoicesDescription')}
                        </p>
                      </div>
                      <Switch
                        checked={billingSettings.autoSendInvoices}
                        onCheckedChange={checked =>
                          setBillingSettings({
                            ...billingSettings,
                            autoSendInvoices: checked,
                          })
                        }
                        disabled={!isEditingSettings}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="bg-muted/50 text-xs text-muted-foreground">
                {t('automationNote')}
              </CardFooter>
            </Card>

            {/* Personnalisation des factures */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileUp className="h-5 w-5" />
                  {t('invoiceCustomization')}
                </CardTitle>
                <CardDescription>{t('invoiceCustomizationDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingSettings ? (
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="invoicePrefix">{t('invoicePrefix')}</Label>
                      <Input
                        id="invoicePrefix"
                        value={billingSettings.invoicePrefix}
                        onChange={e =>
                          setBillingSettings({
                            ...billingSettings,
                            invoicePrefix: e.target.value,
                          })
                        }
                        disabled={!isEditingSettings}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="invoiceNumberFormat">{t('invoiceNumberFormat')}</Label>
                      <Input
                        id="invoiceNumberFormat"
                        value={billingSettings.invoiceNumberFormat}
                        onChange={e =>
                          setBillingSettings({
                            ...billingSettings,
                            invoiceNumberFormat: e.target.value,
                          })
                        }
                        disabled={!isEditingSettings}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t('invoiceNumberFormatPlaceholders')}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="invoiceLogoUrl">{t('invoiceLogo')}</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="invoiceLogoUrl"
                          value={billingSettings.invoiceLogoUrl}
                          onChange={e =>
                            setBillingSettings({
                              ...billingSettings,
                              invoiceLogoUrl: e.target.value,
                            })
                          }
                          disabled={!isEditingSettings}
                        />
                        {isEditingSettings && (
                          <Button variant="outline" size="sm">
                            {t('upload')}
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <p className="font-medium">{t('previewInvoiceNumber')}</p>
                      <div className="text-sm p-2 bg-muted rounded-md font-mono">
                        {billingSettings.invoiceNumberFormat
                          .replace('{YEAR}', new Date().getFullYear().toString())
                          .replace(
                            '{MONTH}',
                            (new Date().getMonth() + 1).toString().padStart(2, '0')
                          )
                          .replace('{NUMBER}', '0001')}
                      </div>
                    </div>

                    {isEditingSettings && (
                      <div className="pt-4">
                        <Button variant="outline" className="w-full">
                          {t('previewInvoiceTemplate')}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Planification des tâches */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t('scheduledTasks')}
              </CardTitle>
              <CardDescription>{t('scheduledTasksDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSettings ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-blue-500" />
                          {t('monthlyBilling')}
                        </h3>
                        <Badge
                          variant={billingSettings.autoBillingEnabled ? 'success' : 'secondary'}
                        >
                          {billingSettings.autoBillingEnabled ? t('active') : t('inactive')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t('nextRunOn', {
                          date: format(
                            new Date(
                              new Date().getFullYear(),
                              new Date().getMonth() +
                                (new Date().getDate() >= billingSettings.billingDay ? 1 : 0),
                              billingSettings.billingDay
                            ),
                            'dd/MM/yyyy'
                          ),
                        })}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        {t('recurrence')}: {t('monthly')}
                      </div>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium flex items-center gap-2">
                          <Bell className="h-4 w-4 text-amber-500" />
                          {t('paymentReminders')}
                        </h3>
                        <Badge variant={billingSettings.remindersEnabled ? 'success' : 'secondary'}>
                          {billingSettings.remindersEnabled ? t('active') : t('inactive')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{t('scheduledDaily')}</p>
                      <div className="text-xs text-muted-foreground">
                        {t('recurrence')}: {t('daily')}
                      </div>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium flex items-center gap-2">
                          <Wallet className="h-4 w-4 text-green-500" />
                          {t('automaticPayouts')}
                        </h3>
                        <Badge
                          variant={billingSettings.autoPayoutsEnabled ? 'success' : 'secondary'}
                        >
                          {billingSettings.autoPayoutsEnabled ? t('active') : t('inactive')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t('nextRunOn', {
                          date: format(addDays(new Date(), 1), 'dd/MM/yyyy'),
                        })}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        {t('recurrence')}: {t('daily')}
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mt-4">
                    <div className="flex items-start gap-2">
                      <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-blue-700">{t('scheduledTasksInfo')}</h3>
                        <p className="text-sm text-blue-600">
                          {t('scheduledTasksInfoDescription')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-between border-t">
              <div className="text-xs text-muted-foreground">
                {t('lastTaskExecution')}: {new Date().toLocaleDateString()}{' '}
                {new Date().toLocaleTimeString()}
              </div>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {t('refresh')}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
