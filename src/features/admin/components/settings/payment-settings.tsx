'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  CreditCard, 
  DollarSign, 
  Percent, 
  Shield, 
  Settings,
  CheckCircle,
  AlertTriangle,
  Zap
} from 'lucide-react'

interface PaymentSettingsProps {
  onSettingsChange: () => void
}

export function PaymentSettings({ onSettingsChange }: PaymentSettingsProps) {
  const [settings, setSettings] = useState({
    // Configuration Stripe
    stripeEnabled: true,
    stripePublishableKey: 'pk_test_...',
    stripeSecretKey: 'sk_test_...',
    stripeWebhookSecret: 'whsec_...',
    stripeCurrency: 'EUR',
    
    // Plans d'abonnement
    subscriptionPlans: {
      FREE: { price: 0, name: 'Gratuit' },
      STARTER: { price: 9.90, name: 'Starter' },
      PREMIUM: { price: 19.99, name: 'Premium' }
    },
    
    // Commissions
    deliveryCommission: 15, // %
    serviceCommission: 20, // %
    cartDropCommission: 10, // %
    
    // Frais et taxes
    platformFee: 2.5, // %
    taxRate: 20, // % TVA
    minimumWithdrawal: 10, // €
    maximumWithdrawal: 1000, // €
    
    // Configuration des paiements
    enableAutoPayments: true,
    enableRefunds: true,
    enablePartialRefunds: true,
    refundWindowDays: 14,
    
    // Sécurité
    enable3DSecure: true,
    requireCVV: true,
    enableFraudDetection: true,
    
    // Notifications
    enablePaymentNotifications: true,
    enableFailedPaymentAlerts: true
  })

  const handleChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
    onSettingsChange()
  }

  const handleNestedChange = (parentKey: string, childKey: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [parentKey]: {
        ...prev[parentKey as keyof typeof prev],
        [childKey]: value
      }
    }))
    onSettingsChange()
  }

  return (
    <div className="space-y-6">
      {/* Configuration Stripe */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Configuration Stripe</span>
            {settings.stripeEnabled && (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Actif
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Configuration du processeur de paiement Stripe
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Activer Stripe</Label>
              <p className="text-sm text-muted-foreground">
                Activer les paiements via Stripe
              </p>
            </div>
            <Switch
              checked={settings.stripeEnabled}
              onCheckedChange={(checked) => handleChange('stripeEnabled', checked)}
            />
          </div>
          
          {settings.stripeEnabled && (
            <>
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="stripePublishableKey">Clé publique</Label>
                  <Input
                    id="stripePublishableKey"
                    value={settings.stripePublishableKey}
                    onChange={(e) => handleChange('stripePublishableKey', e.target.value)}
                    placeholder="pk_test_..."
                    type="password"
                  />
                </div>
                
                <div>
                  <Label htmlFor="stripeSecretKey">Clé secrète</Label>
                  <Input
                    id="stripeSecretKey"
                    value={settings.stripeSecretKey}
                    onChange={(e) => handleChange('stripeSecretKey', e.target.value)}
                    placeholder="sk_test_..."
                    type="password"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="stripeWebhookSecret">Secret webhook</Label>
                <Input
                  id="stripeWebhookSecret"
                  value={settings.stripeWebhookSecret}
                  onChange={(e) => handleChange('stripeWebhookSecret', e.target.value)}
                  placeholder="whsec_..."
                  type="password"
                />
              </div>
              
              <div>
                <Label htmlFor="stripeCurrency">Devise</Label>
                <Select
                  value={settings.stripeCurrency}
                  onValueChange={(value) => handleChange('stripeCurrency', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Plans d'abonnement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Plans d'Abonnement</span>
          </CardTitle>
          <CardDescription>
            Configuration des plans d'abonnement clients
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="freePlan">Plan Gratuit</Label>
              <Input
                id="freePlan"
                value={settings.subscriptionPlans.FREE.price}
                onChange={(e) => handleNestedChange('subscriptionPlans', 'FREE', { 
                  ...settings.subscriptionPlans.FREE, 
                  price: parseFloat(e.target.value) || 0 
                })}
                type="number"
                step="0.01"
                min="0"
              />
              <p className="text-xs text-muted-foreground mt-1">€/mois</p>
            </div>
            
            <div>
              <Label htmlFor="starterPlan">Plan Starter</Label>
              <Input
                id="starterPlan"
                value={settings.subscriptionPlans.STARTER.price}
                onChange={(e) => handleNestedChange('subscriptionPlans', 'STARTER', { 
                  ...settings.subscriptionPlans.STARTER, 
                  price: parseFloat(e.target.value) || 0 
                })}
                type="number"
                step="0.01"
                min="0"
              />
              <p className="text-xs text-muted-foreground mt-1">€/mois</p>
            </div>
            
            <div>
              <Label htmlFor="premiumPlan">Plan Premium</Label>
              <Input
                id="premiumPlan"
                value={settings.subscriptionPlans.PREMIUM.price}
                onChange={(e) => handleNestedChange('subscriptionPlans', 'PREMIUM', { 
                  ...settings.subscriptionPlans.PREMIUM, 
                  price: parseFloat(e.target.value) || 0 
                })}
                type="number"
                step="0.01"
                min="0"
              />
              <p className="text-xs text-muted-foreground mt-1">€/mois</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Percent className="h-5 w-5" />
            <span>Commissions</span>
          </CardTitle>
          <CardDescription>
            Configuration des commissions EcoDeli
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="deliveryCommission">Commission livraison</Label>
              <div className="relative">
                <Input
                  id="deliveryCommission"
                  value={settings.deliveryCommission}
                  onChange={(e) => handleChange('deliveryCommission', parseFloat(e.target.value) || 0)}
                  type="number"
                  step="0.1"
                  min="0"
                  max="50"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
              </div>
            </div>
            
            <div>
              <Label htmlFor="serviceCommission">Commission services</Label>
              <div className="relative">
                <Input
                  id="serviceCommission"
                  value={settings.serviceCommission}
                  onChange={(e) => handleChange('serviceCommission', parseFloat(e.target.value) || 0)}
                  type="number"
                  step="0.1"
                  min="0"
                  max="50"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
              </div>
            </div>
            
            <div>
              <Label htmlFor="cartDropCommission">Commission lâcher chariot</Label>
              <div className="relative">
                <Input
                  id="cartDropCommission"
                  value={settings.cartDropCommission}
                  onChange={(e) => handleChange('cartDropCommission', parseFloat(e.target.value) || 0)}
                  type="number"
                  step="0.1"
                  min="0"
                  max="50"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Frais et taxes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Frais et Taxes</span>
          </CardTitle>
          <CardDescription>
            Configuration des frais de plateforme et taxes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="platformFee">Frais de plateforme</Label>
              <div className="relative">
                <Input
                  id="platformFee"
                  value={settings.platformFee}
                  onChange={(e) => handleChange('platformFee', parseFloat(e.target.value) || 0)}
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
              </div>
            </div>
            
            <div>
              <Label htmlFor="taxRate">Taux de TVA</Label>
              <div className="relative">
                <Input
                  id="taxRate"
                  value={settings.taxRate}
                  onChange={(e) => handleChange('taxRate', parseFloat(e.target.value) || 0)}
                  type="number"
                  step="0.1"
                  min="0"
                  max="30"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="minimumWithdrawal">Retrait minimum</Label>
              <div className="relative">
                <Input
                  id="minimumWithdrawal"
                  value={settings.minimumWithdrawal}
                  onChange={(e) => handleChange('minimumWithdrawal', parseFloat(e.target.value) || 0)}
                  type="number"
                  step="0.01"
                  min="0"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">€</span>
              </div>
            </div>
            
            <div>
              <Label htmlFor="maximumWithdrawal">Retrait maximum</Label>
              <div className="relative">
                <Input
                  id="maximumWithdrawal"
                  value={settings.maximumWithdrawal}
                  onChange={(e) => handleChange('maximumWithdrawal', parseFloat(e.target.value) || 0)}
                  type="number"
                  step="0.01"
                  min="0"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">€</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration des paiements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Configuration des Paiements</span>
          </CardTitle>
          <CardDescription>
            Options de paiement et remboursements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Paiements automatiques</Label>
                <p className="text-sm text-muted-foreground">
                  Activer les paiements automatiques pour les abonnements
                </p>
              </div>
              <Switch
                checked={settings.enableAutoPayments}
                onCheckedChange={(checked) => handleChange('enableAutoPayments', checked)}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Remboursements</Label>
                <p className="text-sm text-muted-foreground">
                  Autoriser les remboursements
                </p>
              </div>
              <Switch
                checked={settings.enableRefunds}
                onCheckedChange={(checked) => handleChange('enableRefunds', checked)}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Remboursements partiels</Label>
                <p className="text-sm text-muted-foreground">
                  Autoriser les remboursements partiels
                </p>
              </div>
              <Switch
                checked={settings.enablePartialRefunds}
                onCheckedChange={(checked) => handleChange('enablePartialRefunds', checked)}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="refundWindowDays">Fenêtre de remboursement (jours)</Label>
            <Input
              id="refundWindowDays"
              type="number"
              value={settings.refundWindowDays}
              onChange={(e) => handleChange('refundWindowDays', parseInt(e.target.value))}
              min="1"
              max="90"
            />
          </div>
        </CardContent>
      </Card>

      {/* Sécurité des paiements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Sécurité des Paiements</span>
          </CardTitle>
          <CardDescription>
            Mesures de sécurité pour les transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>3D Secure</Label>
                <p className="text-sm text-muted-foreground">
                  Activer l'authentification 3D Secure
                </p>
              </div>
              <Switch
                checked={settings.enable3DSecure}
                onCheckedChange={(checked) => handleChange('enable3DSecure', checked)}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>CVV obligatoire</Label>
                <p className="text-sm text-muted-foreground">
                  Exiger le code CVV pour les paiements
                </p>
              </div>
              <Switch
                checked={settings.requireCVV}
                onCheckedChange={(checked) => handleChange('requireCVV', checked)}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Détection de fraude</Label>
                <p className="text-sm text-muted-foreground">
                  Activer la détection automatique de fraude
                </p>
              </div>
              <Switch
                checked={settings.enableFraudDetection}
                onCheckedChange={(checked) => handleChange('enableFraudDetection', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications de paiement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Notifications de Paiement</span>
          </CardTitle>
          <CardDescription>
            Configuration des alertes de paiement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notifications de paiement</Label>
                <p className="text-sm text-muted-foreground">
                  Envoyer des notifications pour les paiements réussis
                </p>
              </div>
              <Switch
                checked={settings.enablePaymentNotifications}
                onCheckedChange={(checked) => handleChange('enablePaymentNotifications', checked)}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Alertes échec de paiement</Label>
                <p className="text-sm text-muted-foreground">
                  Notifier les échecs de paiement
                </p>
              </div>
              <Switch
                checked={settings.enableFailedPaymentAlerts}
                onCheckedChange={(checked) => handleChange('enableFailedPaymentAlerts', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 