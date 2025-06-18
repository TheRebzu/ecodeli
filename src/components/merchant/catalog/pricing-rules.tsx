'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from "@/components/ui/use-toast";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  DollarSign, 
  Percent, 
  Calendar, 
  Clock,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useTranslations } from 'next-intl';

// Schéma de validation pour les règles de tarification
const pricingRuleSchema = z.object({
  name: z.string().min(3, 'Le nom doit contenir au moins 3 caractères'),
  type: z.enum(['DISCOUNT', 'MARKUP', 'FIXED_PRICE', 'DYNAMIC']),
  value: z.number().min(0, 'La valeur doit être positive'),
  valueType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
  conditions: z.object({
    minQuantity: z.number().min(0).optional(),
    maxQuantity: z.number().min(0).optional(),
    minAmount: z.number().min(0).optional(),
    maxAmount: z.number().min(0).optional(),
    customerType: z.enum(['ALL', 'NEW', 'REGULAR', 'VIP']).optional(),
    dayOfWeek: z.array(z.number().min(0).max(6)).optional(),
    timeRange: z.object({
      start: z.string(),
      end: z.string(),
    }).optional(),
  }),
  categories: z.array(z.string()),
  products: z.array(z.string()),
  startDate: z.string().min(1, 'Date de début requise'),
  endDate: z.string().optional(),
  priority: z.number().min(1).max(100),
  isActive: z.boolean().default(true),
  description: z.string().optional(),
});

type PricingRuleFormData = z.infer<typeof pricingRuleSchema>;

// Types pour les règles de tarification
interface PricingRule {
  id: string;
  name: string;
  type: 'DISCOUNT' | 'MARKUP' | 'FIXED_PRICE' | 'DYNAMIC';
  value: number;
  valueType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  conditions: {
    minQuantity?: number;
    maxQuantity?: number;
    minAmount?: number;
    maxAmount?: number;
    customerType?: 'ALL' | 'NEW' | 'REGULAR' | 'VIP';
    dayOfWeek?: number[];
    timeRange?: {
      start: string;
      end: string;
    };
  };
  categories: string[];
  products: string[];
  startDate: string;
  endDate?: string;
  priority: number;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
  totalSavings: number;
  lastUsed?: string;
}

interface PricingStats {
  totalRules: number;
  activeRules: number;
  totalSavings: number;
  averageDiscount: number;
  mostUsedRule?: PricingRule;
  upcomingExpirations: number;
}

/**
 * Composant de gestion des règles de tarification
 * Implémentation selon la Mission 1 - Gestion dynamique des prix et promotions
 */
export default function PricingRules() {
  const t = useTranslations('merchant.pricing');
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
  const [viewRule, setViewRule] = useState<PricingRule | null>(null);

  // Queries tRPC
  const { data: rules, isLoading, refetch } = api.merchant.getPricingRules.useQuery();
  const { data: pricingStats } = api.merchant.getPricingStats.useQuery();
  const { data: categories } = api.merchant.getProductCategories.useQuery();
  const { data: products } = api.merchant.getProducts.useQuery();

  // Mutations tRPC
  const createRuleMutation = api.merchant.createPricingRule.useMutation({
    onSuccess: () => {
      toast({
        title: 'Règle créée',
        description: 'La règle de tarification a été créée avec succès.',
      });
      setIsDialogOpen(false);
      setEditingRule(null);
      refetch();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateRuleMutation = api.merchant.updatePricingRule.useMutation({
    onSuccess: () => {
      toast({
        title: 'Règle mise à jour',
        description: 'La règle de tarification a été mise à jour.',
      });
      setIsDialogOpen(false);
      setEditingRule(null);
      refetch();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteRuleMutation = api.merchant.deletePricingRule.useMutation({
    onSuccess: () => {
      toast({
        title: 'Règle supprimée',
        description: 'La règle de tarification a été supprimée.',
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const toggleRuleMutation = api.merchant.togglePricingRule.useMutation({
    onSuccess: () => {
      toast({
        title: 'Statut mis à jour',
        description: 'Le statut de la règle a été modifié.',
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Form setup
  const form = useForm<PricingRuleFormData>({
    resolver: zodResolver(pricingRuleSchema),
    defaultValues: {
      name: '',
      type: 'DISCOUNT',
      value: 0,
      valueType: 'PERCENTAGE',
      conditions: {
        customerType: 'ALL',
      },
      categories: [],
      products: [],
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      priority: 50,
      isActive: true,
      description: '',
    },
  });

  // Handlers
  const onSubmit = async (data: PricingRuleFormData) => {
    if (editingRule) {
      updateRuleMutation.mutate({ id: editingRule.id, ...data });
    } else {
      createRuleMutation.mutate(data);
    }
  };

  const handleEdit = (rule: PricingRule) => {
    setEditingRule(rule);
    form.reset({
      name: rule.name,
      type: rule.type,
      value: rule.value,
      valueType: rule.valueType,
      conditions: rule.conditions,
      categories: rule.categories,
      products: rule.products,
      startDate: rule.startDate,
      endDate: rule.endDate || '',
      priority: rule.priority,
      isActive: rule.isActive,
      description: rule.description || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (ruleId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette règle ?')) {
      deleteRuleMutation.mutate({ id: ruleId });
    }
  };

  const handleToggle = (ruleId: string, isActive: boolean) => {
    toggleRuleMutation.mutate({ id: ruleId, isActive: !isActive });
  };

  // Helper functions
  const getTypeBadge = (type: PricingRule['type']) => {
    const typeConfig = {
      DISCOUNT: { label: 'Remise', variant: 'default' as const, icon: Percent },
      MARKUP: { label: 'Majoration', variant: 'secondary' as const, icon: TrendingUp },
      FIXED_PRICE: { label: 'Prix fixe', variant: 'outline' as const, icon: DollarSign },
      DYNAMIC: { label: 'Dynamique', variant: 'destructive' as const, icon: Target },
    };

    const config = typeConfig[type];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatValue = (value: number, valueType: PricingRule['valueType']) => {
    if (valueType === 'PERCENTAGE') {
      return `${value}%`;
    }
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const isRuleExpiringSoon = (endDate?: string) => {
    if (!endDate) return false;
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays > 0;
  };

  const isRuleExpired = (endDate?: string) => {
    if (!endDate) return false;
    return new Date(endDate) < new Date();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Règles de Tarification</h1>
          <p className="text-muted-foreground">
            Gérez vos promotions, remises et règles de prix dynamiques
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle règle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? 'Modifier la règle' : 'Nouvelle règle de tarification'}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom de la règle *</FormLabel>
                        <FormControl>
                          <Input placeholder="ex: Remise étudiants" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type de règle *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner le type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="DISCOUNT">Remise</SelectItem>
                            <SelectItem value="MARKUP">Majoration</SelectItem>
                            <SelectItem value="FIXED_PRICE">Prix fixe</SelectItem>
                            <SelectItem value="DYNAMIC">Dynamique</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valeur *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="10"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="valueType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type de valeur *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PERCENTAGE">Pourcentage (%)</SelectItem>
                            <SelectItem value="FIXED_AMOUNT">Montant fixe (€)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priorité (1-100) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            placeholder="50"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 50)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date de début *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date de fin (optionnel)</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Conditions */}
                <div className="space-y-4 border rounded-lg p-4">
                  <h3 className="font-medium">Conditions d'application</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="conditions.minQuantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantité minimum</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="1"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="conditions.maxQuantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantité maximum</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="100"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="conditions.minAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Montant minimum (€)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="50.00"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="conditions.customerType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type de client</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ALL">Tous</SelectItem>
                              <SelectItem value="NEW">Nouveaux</SelectItem>
                              <SelectItem value="REGULAR">Réguliers</SelectItem>
                              <SelectItem value="VIP">VIP</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Catégories et produits */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="categories"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Catégories (optionnel)</FormLabel>
                        <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2">
                          {categories?.map((category) => (
                            <label key={category.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={field.value.includes(category.id)}
                                onChange={(e) => {
                                  const updatedCategories = e.target.checked
                                    ? [...field.value, category.id]
                                    : field.value.filter(id => id !== category.id);
                                  field.onChange(updatedCategories);
                                }}
                              />
                              <span className="text-sm">{category.name}</span>
                            </label>
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="products"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Produits spécifiques (optionnel)</FormLabel>
                        <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2">
                          {products?.map((product) => (
                            <label key={product.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={field.value.includes(product.id)}
                                onChange={(e) => {
                                  const updatedProducts = e.target.checked
                                    ? [...field.value, product.id]
                                    : field.value.filter(id => id !== product.id);
                                  field.onChange(updatedProducts);
                                }}
                              />
                              <span className="text-sm">{product.name}</span>
                            </label>
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (optionnel)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Description de la règle de tarification..."
                          className="min-h-[60px]"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Règle active</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          La règle sera appliquée automatiquement si activée
                        </div>
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

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingRule(null);
                      form.reset();
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={createRuleMutation.isPending || updateRuleMutation.isPending}
                  >
                    {editingRule ? 'Mettre à jour' : 'Créer la règle'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistiques */}
      {pricingStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Règles totales</p>
                  <p className="text-2xl font-bold">{pricingStats.totalRules}</p>
                </div>
                <Target className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Règles actives</p>
                  <p className="text-2xl font-bold text-green-600">{pricingStats.activeRules}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Économies totales</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(pricingStats.totalSavings)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Remise moyenne</p>
                  <p className="text-2xl font-bold text-purple-600">{pricingStats.averageDiscount}%</p>
                </div>
                <Percent className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Liste des règles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rules?.map((rule) => (
          <Card key={rule.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {rule.name}
                    {!rule.isActive && (
                      <Badge variant="outline">Inactif</Badge>
                    )}
                    {isRuleExpired(rule.endDate) && (
                      <Badge variant="destructive">Expiré</Badge>
                    )}
                    {isRuleExpiringSoon(rule.endDate) && (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Expire bientôt
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {rule.description || 'Aucune description'}
                  </CardDescription>
                </div>
                {getTypeBadge(rule.type)}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Valeur:</span>
                <span className="font-medium">{formatValue(rule.value, rule.valueType)}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Priorité:</span>
                <span>{rule.priority}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Utilisations:</span>
                <span>{rule.usageCount}</span>
              </div>

              {rule.totalSavings > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Économies:</span>
                  <span className="font-medium text-green-600">{formatCurrency(rule.totalSavings)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Début:</span>
                <span>{new Date(rule.startDate).toLocaleDateString('fr-FR')}</span>
              </div>

              {rule.endDate && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Fin:</span>
                  <span>{new Date(rule.endDate).toLocaleDateString('fr-FR')}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setViewRule(rule)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Voir
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(rule)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Modifier
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggle(rule.id, rule.isActive)}
                  disabled={toggleRuleMutation.isPending}
                >
                  {rule.isActive ? 'Désactiver' : 'Activer'}
                </Button>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(rule.id)}
                  disabled={deleteRuleMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog de détail */}
      {viewRule && (
        <Dialog open={!!viewRule} onOpenChange={() => setViewRule(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {viewRule.name}
                {getTypeBadge(viewRule.type)}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Valeur</label>
                  <p>{formatValue(viewRule.value, viewRule.valueType)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Priorité</label>
                  <p>{viewRule.priority}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date de début</label>
                  <p>{new Date(viewRule.startDate).toLocaleDateString('fr-FR')}</p>
                </div>
                {viewRule.endDate && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Date de fin</label>
                    <p>{new Date(viewRule.endDate).toLocaleDateString('fr-FR')}</p>
                  </div>
                )}
              </div>

              {viewRule.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="text-sm leading-relaxed">{viewRule.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Utilisations</label>
                  <p>{viewRule.usageCount}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Économies totales</label>
                  <p className="text-green-600 font-medium">{formatCurrency(viewRule.totalSavings)}</p>
                </div>
              </div>

              {viewRule.lastUsed && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Dernière utilisation</label>
                  <p>{new Date(viewRule.lastUsed).toLocaleDateString('fr-FR')}</p>
                </div>
              )}

              {/* Conditions */}
              {Object.keys(viewRule.conditions).length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Conditions</label>
                  <div className="mt-1 space-y-1 text-sm">
                    {viewRule.conditions.minQuantity && (
                      <p>• Quantité minimum: {viewRule.conditions.minQuantity}</p>
                    )}
                    {viewRule.conditions.maxQuantity && (
                      <p>• Quantité maximum: {viewRule.conditions.maxQuantity}</p>
                    )}
                    {viewRule.conditions.minAmount && (
                      <p>• Montant minimum: {formatCurrency(viewRule.conditions.minAmount)}</p>
                    )}
                    {viewRule.conditions.customerType && viewRule.conditions.customerType !== 'ALL' && (
                      <p>• Type de client: {viewRule.conditions.customerType}</p>
                    )}
                  </div>
                </div>
              )}

              {(viewRule.categories.length > 0 || viewRule.products.length > 0) && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Application</label>
                  <div className="mt-1 text-sm">
                    {viewRule.categories.length > 0 && (
                      <p>• {viewRule.categories.length} catégorie(s) sélectionnée(s)</p>
                    )}
                    {viewRule.products.length > 0 && (
                      <p>• {viewRule.products.length} produit(s) spécifique(s)</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* État vide */}
      {rules?.length === 0 && (
        <Card className="p-8 text-center">
          <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucune règle de tarification</h3>
          <p className="text-muted-foreground mb-4">
            Créez votre première règle pour gérer vos promotions et remises.
          </p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Créer ma première règle
          </Button>
        </Card>
      )}
    </div>
  );
}
