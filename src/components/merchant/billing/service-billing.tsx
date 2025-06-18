'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from "@/components/ui/use-toast";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  CreditCard, 
  Euro, 
  FileText, 
  Package, 
  TrendingUp, 
  TrendingDown,
  Plus,
  Edit,
  Trash2,
  Settings,
  Calculator,
  BarChart3,
  PieChart,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  Upload,
  Zap,
  Target,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Schéma de validation pour les services
const serviceSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  description: z.string().min(10, 'La description doit contenir au moins 10 caractères'),
  category: z.string().min(1, 'Veuillez sélectionner une catégorie'),
  basePrice: z.number().min(0.01, 'Le prix doit être supérieur à 0'),
  unit: z.string().min(1, 'Veuillez sélectionner une unité'),
  taxRate: z.number().min(0).max(100, 'Le taux de TVA doit être entre 0 et 100%'),
  isActive: z.boolean(),
  minimumQuantity: z.number().min(1, 'La quantité minimum doit être au moins 1'),
  maximumQuantity: z.number().optional(),
  commission: z.number().min(0).max(100, 'La commission doit être entre 0 et 100%'),
  tags: z.array(z.string()).optional(),
});

// Schéma pour les règles de tarification
const pricingRuleSchema = z.object({
  serviceId: z.string().min(1, 'Veuillez sélectionner un service'),
  name: z.string().min(2, 'Le nom de la règle est requis'),
  type: z.enum(['QUANTITY_DISCOUNT', 'TIME_BASED', 'SEASONAL', 'CUSTOMER_TYPE']),
  conditions: z.object({
    minQuantity: z.number().optional(),
    maxQuantity: z.number().optional(),
    timeStart: z.string().optional(),
    timeEnd: z.string().optional(),
    customerType: z.string().optional(),
    seasonStart: z.string().optional(),
    seasonEnd: z.string().optional(),
  }),
  discount: z.object({
    type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
    value: z.number().min(0, 'La valeur de remise doit être positive'),
  }),
  isActive: z.boolean(),
});

type ServiceFormData = z.infer<typeof serviceSchema>;
type PricingRuleFormData = z.infer<typeof pricingRuleSchema>;

/**
 * Composant de gestion de la facturation des services pour les commerçants
 * Implémentation selon la Mission 1 - Gestion complète des services et tarification
 */
export default function ServiceBilling() {
  const t = useTranslations('merchant.billing');
  const [activeTab, setActiveTab] = useState('services');
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [showPricingForm, setShowPricingForm] = useState(false);
  const [editingService, setEditingService] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<string | null>(null);

  // Requêtes tRPC réelles
  const { data: services, isLoading: servicesLoading, refetch: refetchServices } = api.merchant.getServices.useQuery();
  const { data: serviceStats } = api.merchant.getServiceStatistics.useQuery();
  const { data: pricingRules, refetch: refetchRules } = api.merchant.getPricingRules.useQuery();
  const { data: categories } = api.merchant.getServiceCategories.useQuery();
  const { data: billingHistory } = api.merchant.getBillingHistory.useQuery();

  // Mutations tRPC réelles
  const createServiceMutation = api.merchant.createService.useMutation({
    onSuccess: () => {
      toast({
        title: t('serviceCreated'),
        description: t('serviceCreatedDescription'),
      });
      refetchServices();
      setShowServiceForm(false);
      serviceForm.reset();
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateServiceMutation = api.merchant.updateService.useMutation({
    onSuccess: () => {
      toast({
        title: t('serviceUpdated'),
        description: t('serviceUpdatedDescription'),
      });
      refetchServices();
      setEditingService(null);
      serviceForm.reset();
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteServiceMutation = api.merchant.deleteService.useMutation({
    onSuccess: () => {
      toast({
        title: t('serviceDeleted'),
        description: t('serviceDeletedDescription'),
      });
      refetchServices();
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createPricingRuleMutation = api.merchant.createPricingRule.useMutation({
    onSuccess: () => {
      toast({
        title: t('ruleCreated'),
        description: t('ruleCreatedDescription'),
      });
      refetchRules();
      setShowPricingForm(false);
      pricingForm.reset();
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updatePricingRuleMutation = api.merchant.updatePricingRule.useMutation({
    onSuccess: () => {
      toast({
        title: t('ruleUpdated'),
        description: t('ruleUpdatedDescription'),
      });
      refetchRules();
      setEditingRule(null);
      pricingForm.reset();
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deletePricingRuleMutation = api.merchant.deletePricingRule.useMutation({
    onSuccess: () => {
      toast({
        title: t('ruleDeleted'),
        description: t('ruleDeletedDescription'),
      });
      refetchRules();
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const toggleServiceStatusMutation = api.merchant.toggleServiceStatus.useMutation({
    onSuccess: () => {
      toast({
        title: t('statusUpdated'),
        description: t('statusUpdatedDescription'),
      });
      refetchServices();
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Formulaires
  const serviceForm = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      basePrice: 0,
      unit: '',
      taxRate: 20,
      isActive: true,
      minimumQuantity: 1,
      commission: 0,
      tags: [],
    },
  });

  const pricingForm = useForm<PricingRuleFormData>({
    resolver: zodResolver(pricingRuleSchema),
    defaultValues: {
      serviceId: '',
      name: '',
      type: 'QUANTITY_DISCOUNT',
      conditions: {},
      discount: {
        type: 'PERCENTAGE',
        value: 0,
      },
      isActive: true,
    },
  });

  // Gestionnaires d'événements
  const handleServiceSubmit = (data: ServiceFormData) => {
    if (editingService) {
      updateServiceMutation.mutate({ id: editingService, ...data });
    } else {
      createServiceMutation.mutate(data);
    }
  };

  const handlePricingSubmit = (data: PricingRuleFormData) => {
    if (editingRule) {
      updatePricingRuleMutation.mutate({ id: editingRule, ...data });
    } else {
      createPricingRuleMutation.mutate(data);
    }
  };

  const handleEditService = (service: any) => {
    setEditingService(service.id);
    serviceForm.reset({
      name: service.name,
      description: service.description,
      category: service.category,
      basePrice: service.basePrice,
      unit: service.unit,
      taxRate: service.taxRate,
      isActive: service.isActive,
      minimumQuantity: service.minimumQuantity,
      maximumQuantity: service.maximumQuantity,
      commission: service.commission,
      tags: service.tags || [],
    });
    setShowServiceForm(true);
  };

  const handleEditRule = (rule: any) => {
    setEditingRule(rule.id);
    pricingForm.reset({
      serviceId: rule.serviceId,
      name: rule.name,
      type: rule.type,
      conditions: rule.conditions,
      discount: rule.discount,
      isActive: rule.isActive,
    });
    setShowPricingForm(true);
  };

  const handleDeleteService = (serviceId: string) => {
    if (confirm(t('confirmDeleteService'))) {
      deleteServiceMutation.mutate({ id: serviceId });
    }
  };

  const handleDeleteRule = (ruleId: string) => {
    if (confirm(t('confirmDeleteRule'))) {
      deletePricingRuleMutation.mutate({ id: ruleId });
    }
  };

  const handleToggleServiceStatus = (serviceId: string) => {
    toggleServiceStatusMutation.mutate({ id: serviceId });
  };

  // Fonctions utilitaires
  const getStatusBadge = (isActive: boolean) => {
    return (
      <Badge className={cn(
        'flex items-center gap-1',
        isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
      )}>
        {isActive ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
        {isActive ? t('active') : t('inactive')}
      </Badge>
    );
  };

  const getRuleTypeBadge = (type: string) => {
    const typeConfig = {
      QUANTITY_DISCOUNT: { color: 'bg-blue-100 text-blue-800', label: t('quantityDiscount') },
      TIME_BASED: { color: 'bg-purple-100 text-purple-800', label: t('timeBased') },
      SEASONAL: { color: 'bg-orange-100 text-orange-800', label: t('seasonal') },
      CUSTOMER_TYPE: { color: 'bg-green-100 text-green-800', label: t('customerType') },
    };
    
    const config = typeConfig[type as keyof typeof typeConfig];
    if (!config) return null;
    
    return (
      <Badge className={cn('flex items-center gap-1', config.color)}>
        {config.label}
      </Badge>
    );
  };

  if (servicesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('serviceBilling')}</h1>
            <p className="text-muted-foreground">{t('manageServicesAndPricing')}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="w-6 h-6" />
            {t('serviceBilling')}
          </h1>
          <p className="text-muted-foreground">{t('manageServicesAndPricing')}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowServiceForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('addService')}
          </Button>
          <Button variant="outline" onClick={() => setShowPricingForm(true)}>
            <Target className="w-4 h-4 mr-2" />
            {t('addPricingRule')}
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      {serviceStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('totalRevenue')}</p>
                  <p className="text-2xl font-bold">{serviceStats.totalRevenue.toFixed(2)} €</p>
                </div>
                <Euro className="w-8 h-8 text-green-600" />
              </div>
              <div className="flex items-center gap-1 mt-2">
                {serviceStats.revenueGrowth >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <span className={cn(
                  'text-sm font-medium',
                  serviceStats.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {Math.abs(serviceStats.revenueGrowth).toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('activeServices')}</p>
                  <p className="text-2xl font-bold">{serviceStats.activeServices}</p>
                </div>
                <Package className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {t('totalServices', { total: serviceStats.totalServices })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('averageOrderValue')}</p>
                  <p className="text-2xl font-bold">{serviceStats.averageOrderValue.toFixed(2)} €</p>
                </div>
                <BarChart3 className="w-8 h-8 text-purple-600" />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {t('thisMonth')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('pricingRules')}</p>
                  <p className="text-2xl font-bold">{serviceStats.activePricingRules}</p>
                </div>
                <Target className="w-8 h-8 text-orange-600" />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {t('activeRules')}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="services">{t('services')}</TabsTrigger>
          <TabsTrigger value="pricing">{t('pricingRules')}</TabsTrigger>
          <TabsTrigger value="history">{t('billingHistory')}</TabsTrigger>
        </TabsList>

        {/* Onglet Services */}
        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('serviceList')}</CardTitle>
              <CardDescription>
                {t('manageYourServices')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {services && services.length > 0 ? (
                <div className="space-y-4">
                  {services.map((service) => (
                    <div key={service.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <h3 className="font-semibold">{service.name}</h3>
                            <p className="text-sm text-muted-foreground">{service.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline">{service.category}</Badge>
                              {getStatusBadge(service.isActive)}
                            </div>
                          </div>
                          <Separator orientation="vertical" className="h-16" />
                          <div>
                            <p className="text-sm text-muted-foreground">{t('basePrice')}</p>
                            <p className="font-bold text-lg">{service.basePrice.toFixed(2)} €</p>
                            <p className="text-sm text-muted-foreground">
                              {t('perUnit', { unit: service.unit })}
                            </p>
                          </div>
                          <Separator orientation="vertical" className="h-16" />
                          <div>
                            <p className="text-sm text-muted-foreground">{t('commission')}</p>
                            <p className="font-medium">{service.commission}%</p>
                            <p className="text-sm text-muted-foreground">
                              {t('taxRate', { rate: service.taxRate })}%
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleServiceStatus(service.id)}
                          >
                            {service.isActive ? (
                              <>
                                <AlertCircle className="w-4 h-4 mr-2" />
                                {t('deactivate')}
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                {t('activate')}
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditService(service)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            {t('edit')}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteService(service.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {t('delete')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{t('noServicesFound')}</h3>
                  <p className="text-muted-foreground mb-4">{t('noServicesDescription')}</p>
                  <Button onClick={() => setShowServiceForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('addFirstService')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Règles de tarification */}
        <TabsContent value="pricing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('pricingRules')}</CardTitle>
              <CardDescription>
                {t('managePricingRules')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pricingRules && pricingRules.length > 0 ? (
                <div className="space-y-4">
                  {pricingRules.map((rule) => (
                    <div key={rule.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <h3 className="font-semibold">{rule.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {t('service')}: {rule.serviceName}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              {getRuleTypeBadge(rule.type)}
                              {getStatusBadge(rule.isActive)}
                            </div>
                          </div>
                          <Separator orientation="vertical" className="h-16" />
                          <div>
                            <p className="text-sm text-muted-foreground">{t('discount')}</p>
                            <p className="font-bold text-lg">
                              {rule.discount.type === 'PERCENTAGE' 
                                ? `${rule.discount.value}%`
                                : `${rule.discount.value.toFixed(2)} €`
                              }
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditRule(rule)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            {t('edit')}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteRule(rule.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {t('delete')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{t('noPricingRules')}</h3>
                  <p className="text-muted-foreground mb-4">{t('noPricingRulesDescription')}</p>
                  <Button onClick={() => setShowPricingForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('addFirstRule')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Historique */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('billingHistory')}</CardTitle>
              <CardDescription>
                {t('viewBillingHistory')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {billingHistory && billingHistory.length > 0 ? (
                <div className="space-y-4">
                  {billingHistory.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <h3 className="font-semibold">{item.serviceName}</h3>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(item.date), 'dd MMMM yyyy', { locale: fr })}
                            </p>
                          </div>
                          <Separator orientation="vertical" className="h-8" />
                          <div>
                            <p className="text-sm text-muted-foreground">{t('quantity')}</p>
                            <p className="font-medium">{item.quantity}</p>
                          </div>
                          <Separator orientation="vertical" className="h-8" />
                          <div>
                            <p className="text-sm text-muted-foreground">{t('amount')}</p>
                            <p className="font-bold text-lg">{item.amount.toFixed(2)} €</p>
                          </div>
                        </div>
                        <Badge className={cn(
                          item.status === 'PAID' ? 'bg-green-100 text-green-800' : 
                          item.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        )}>
                          {t(item.status.toLowerCase())}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{t('noBillingHistory')}</h3>
                  <p className="text-muted-foreground">{t('noBillingHistoryDescription')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog pour ajouter/modifier un service */}
      <Dialog open={showServiceForm} onOpenChange={setShowServiceForm}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingService ? t('editService') : t('addService')}
            </DialogTitle>
            <DialogDescription>
              {editingService ? t('editServiceDescription') : t('addServiceDescription')}
            </DialogDescription>
          </DialogHeader>
          <Form {...serviceForm}>
            <form onSubmit={serviceForm.handleSubmit(handleServiceSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={serviceForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('serviceName')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('enterServiceName')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={serviceForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('category')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('selectCategory')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={serviceForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('description')}</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={t('enterServiceDescription')} 
                        {...field} 
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={serviceForm.control}
                  name="basePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('basePrice')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={serviceForm.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('unit')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('selectUnit')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="piece">{t('piece')}</SelectItem>
                          <SelectItem value="hour">{t('hour')}</SelectItem>
                          <SelectItem value="kg">{t('kg')}</SelectItem>
                          <SelectItem value="m2">{t('m2')}</SelectItem>
                          <SelectItem value="service">{t('service')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={serviceForm.control}
                  name="taxRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('taxRate')} (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1"
                          placeholder="20"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={serviceForm.control}
                  name="minimumQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('minimumQuantity')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1"
                          placeholder="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={serviceForm.control}
                  name="maximumQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('maximumQuantity')} ({t('optional')})</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1"
                          placeholder={t('unlimited')}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={serviceForm.control}
                  name="commission"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('commission')} (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1"
                          min="0"
                          max="100"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={serviceForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">{t('activeService')}</FormLabel>
                      <FormDescription>
                        {t('activeServiceDescription')}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowServiceForm(false);
                    setEditingService(null);
                    serviceForm.reset();
                  }}
                >
                  {t('cancel')}
                </Button>
                <Button 
                  type="submit" 
                  disabled={createServiceMutation.isPending || updateServiceMutation.isPending}
                >
                  {editingService ? t('updateService') : t('createService')}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog pour ajouter/modifier une règle de tarification */}
      <Dialog open={showPricingForm} onOpenChange={setShowPricingForm}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? t('editPricingRule') : t('addPricingRule')}
            </DialogTitle>
            <DialogDescription>
              {editingRule ? t('editPricingRuleDescription') : t('addPricingRuleDescription')}
            </DialogDescription>
          </DialogHeader>
          <Form {...pricingForm}>
            <form onSubmit={pricingForm.handleSubmit(handlePricingSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={pricingForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('ruleName')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('enterRuleName')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={pricingForm.control}
                  name="serviceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('service')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('selectService')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {services?.map((service) => (
                            <SelectItem key={service.id} value={service.id}>
                              {service.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={pricingForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('ruleType')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('selectRuleType')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="QUANTITY_DISCOUNT">{t('quantityDiscount')}</SelectItem>
                        <SelectItem value="TIME_BASED">{t('timeBased')}</SelectItem>
                        <SelectItem value="SEASONAL">{t('seasonal')}</SelectItem>
                        <SelectItem value="CUSTOMER_TYPE">{t('customerType')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={pricingForm.control}
                  name="discount.type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('discountType')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('selectDiscountType')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PERCENTAGE">{t('percentage')}</SelectItem>
                          <SelectItem value="FIXED_AMOUNT">{t('fixedAmount')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={pricingForm.control}
                  name="discount.value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('discountValue')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          min="0"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={pricingForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">{t('activeRule')}</FormLabel>
                      <FormDescription>
                        {t('activeRuleDescription')}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowPricingForm(false);
                    setEditingRule(null);
                    pricingForm.reset();
                  }}
                >
                  {t('cancel')}
                </Button>
                <Button 
                  type="submit" 
                  disabled={createPricingRuleMutation.isPending || updatePricingRuleMutation.isPending}
                >
                  {editingRule ? t('updateRule') : t('createRule')}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
