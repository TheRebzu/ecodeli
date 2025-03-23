"use client";

import { useState } from "react";
import { 
  Settings, 
  Globe, 
  Mail, 
  CreditCard, 
  BellRing, 
  Key, 
  Users, 
  UserCog, 
  Shield,
  Save,
  HardDrive
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

// Settings page component
export function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
    }, 1000);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Paramètres</h2>
          <p className="text-muted-foreground">
            Configurez les paramètres de votre plateforme
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>Enregistrement...</>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Enregistrer les modifications
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full h-12 mb-8">
          <TabsTrigger value="general" className="flex gap-2 items-center">
            <Settings className="h-4 w-4" />
            <span>Général</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex gap-2 items-center">
            <Globe className="h-4 w-4" />
            <span>Apparence</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex gap-2 items-center">
            <BellRing className="h-4 w-4" />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex gap-2 items-center">
            <CreditCard className="h-4 w-4" />
            <span>Paiements</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex gap-2 items-center">
            <Shield className="h-4 w-4" />
            <span>Sécurité</span>
          </TabsTrigger>
        </TabsList>

        {/* Général */}
        <TabsContent value="general">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Informations générales</CardTitle>
                <CardDescription>
                  Configurez les informations de base de votre plateforme.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="platform-name">Nom de la plateforme</Label>
                    <Input id="platform-name" defaultValue="EcoDeli" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="platform-url">URL du site</Label>
                    <Input id="platform-url" defaultValue="https://ecodeli.fr" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="platform-description">Description</Label>
                  <Textarea 
                    id="platform-description" 
                    defaultValue="Plateforme de livraison éco-responsable pour les commerces locaux."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="contact-email">Email de contact</Label>
                    <Input id="contact-email" type="email" defaultValue="contact@ecodeli.fr" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="support-email">Email du support</Label>
                    <Input id="support-email" type="email" defaultValue="support@ecodeli.fr" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Paramètres régionaux</CardTitle>
                <CardDescription>
                  Configurez les paramètres spécifiques à votre région.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Fuseau horaire</Label>
                    <Select defaultValue="Europe/Paris">
                      <SelectTrigger id="timezone">
                        <SelectValue placeholder="Sélectionner un fuseau horaire" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Europe/Paris">Europe/Paris</SelectItem>
                        <SelectItem value="Europe/London">Europe/London</SelectItem>
                        <SelectItem value="America/New_York">America/New_York</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Devise</Label>
                    <Select defaultValue="EUR">
                      <SelectTrigger id="currency">
                        <SelectValue placeholder="Sélectionner une devise" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">Euro (€)</SelectItem>
                        <SelectItem value="USD">Dollar ($)</SelectItem>
                        <SelectItem value="GBP">Livre (£)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Langue par défaut</Label>
                    <Select defaultValue="fr">
                      <SelectTrigger id="language">
                        <SelectValue placeholder="Sélectionner une langue" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="en">Anglais</SelectItem>
                        <SelectItem value="es">Espagnol</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Apparence */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Personnalisation de l'interface</CardTitle>
              <CardDescription>
                Personnalisez l'apparence de votre plateforme.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="primary-color">Couleur principale</Label>
                  <div className="flex gap-2">
                    <Input id="primary-color" type="color" defaultValue="#3b82f6" className="w-16 h-10" />
                    <Input defaultValue="#3b82f6" className="flex-1" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondary-color">Couleur secondaire</Label>
                  <div className="flex gap-2">
                    <Input id="secondary-color" type="color" defaultValue="#10b981" className="w-16 h-10" />
                    <Input defaultValue="#10b981" className="flex-1" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo-upload">Logo</Label>
                <Input id="logo-upload" type="file" accept="image/*" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="favicon-upload">Favicon</Label>
                <Input id="favicon-upload" type="file" accept="image/*" />
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="darkmode" />
                <Label htmlFor="darkmode">Activer le mode sombre par défaut</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifications par email</CardTitle>
              <CardDescription>
                Configurez les emails envoyés automatiquement par la plateforme.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Notifications de nouvelle commande</h4>
                    <p className="text-sm text-muted-foreground">Envoyer un email aux marchands pour chaque nouvelle commande</p>
                  </div>
                  <Switch id="new-order-notification" defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Confirmation d'inscription</h4>
                    <p className="text-sm text-muted-foreground">Envoyer un email de bienvenue aux nouveaux utilisateurs</p>
                  </div>
                  <Switch id="welcome-email" defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Récapitulatifs hebdomadaires</h4>
                    <p className="text-sm text-muted-foreground">Envoyer un résumé hebdomadaire des activités aux marchands</p>
                  </div>
                  <Switch id="weekly-summary" defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Alertes de stock</h4>
                    <p className="text-sm text-muted-foreground">Notifier les marchands quand les stocks sont bas</p>
                  </div>
                  <Switch id="stock-alert" defaultChecked />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Notifications dans l'application</CardTitle>
              <CardDescription>
                Gérez les notifications internes de l'application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Mises à jour de statut</h4>
                    <p className="text-sm text-muted-foreground">Notifier les utilisateurs des changements de statut de commande</p>
                  </div>
                  <Switch id="status-update-notification" defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Promotions</h4>
                    <p className="text-sm text-muted-foreground">Envoyer des notifications pour les offres promotionnelles</p>
                  </div>
                  <Switch id="promo-notification" defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Nouveaux produits</h4>
                    <p className="text-sm text-muted-foreground">Alerter les utilisateurs des nouveaux produits</p>
                  </div>
                  <Switch id="new-product-notification" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Paiements */}
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres de paiement</CardTitle>
              <CardDescription>
                Configurez les options de paiement de la plateforme.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="payment-provider">Prestataire de paiement</Label>
                  <Select defaultValue="stripe">
                    <SelectTrigger id="payment-provider">
                      <SelectValue placeholder="Sélectionner un prestataire" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stripe">Stripe</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="adyen">Adyen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transaction-mode">Mode</Label>
                  <Select defaultValue="test">
                    <SelectTrigger id="transaction-mode">
                      <SelectValue placeholder="Sélectionner un mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="test">Test</SelectItem>
                      <SelectItem value="live">Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stripe-publishable-key">Clé publique Stripe</Label>
                <Input id="stripe-publishable-key" defaultValue="pk_test_..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stripe-secret-key">Clé secrète Stripe</Label>
                <Input id="stripe-secret-key" type="password" defaultValue="sk_test_..." />
              </div>

              <div className="space-y-2">
                <Label>Méthodes de paiement acceptées</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <Switch id="accept-card" defaultChecked />
                    <Label htmlFor="accept-card">Cartes bancaires</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="accept-applepay" defaultChecked />
                    <Label htmlFor="accept-applepay">Apple Pay</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="accept-googlepay" defaultChecked />
                    <Label htmlFor="accept-googlepay">Google Pay</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="accept-paypal" />
                    <Label htmlFor="accept-paypal">PayPal</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Frais et commissions</CardTitle>
              <CardDescription>
                Définissez les frais appliqués sur la plateforme.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="platform-fee">Commission de la plateforme (%)</Label>
                  <Input id="platform-fee" type="number" min="0" max="100" step="0.1" defaultValue="10" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delivery-fee">Frais de livraison (€)</Label>
                  <Input id="delivery-fee" type="number" min="0" step="0.5" defaultValue="2.99" />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="free-delivery-threshold" defaultChecked />
                <div className="flex-1">
                  <Label htmlFor="free-delivery-threshold">Livraison gratuite à partir de</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input id="free-delivery-amount" type="number" min="0" step="1" defaultValue="30" disabled={false} />
                    <span className="text-sm">€</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sécurité */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Sécurité du compte</CardTitle>
              <CardDescription>
                Configurez les paramètres de sécurité pour l'accès à la plateforme.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Authentification à deux facteurs (2FA)</h4>
                  <p className="text-sm text-muted-foreground">Exiger la 2FA pour les comptes administrateurs</p>
                </div>
                <Switch id="require-2fa" defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Sessions sécurisées</h4>
                  <p className="text-sm text-muted-foreground">Déconnecter automatiquement après 30 minutes d'inactivité</p>
                </div>
                <Switch id="auto-logout" defaultChecked />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="password-policy">Politique de mot de passe</Label>
                <Select defaultValue="strong">
                  <SelectTrigger id="password-policy">
                    <SelectValue placeholder="Sélectionner une politique" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basique (minimum 8 caractères)</SelectItem>
                    <SelectItem value="medium">Moyenne (majuscules, minuscules, chiffres)</SelectItem>
                    <SelectItem value="strong">Forte (+ caractères spéciaux)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Sauvegarde et restauration</CardTitle>
              <CardDescription>
                Gérez les sauvegardes de vos données.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Sauvegardes automatiques</h4>
                  <p className="text-sm text-muted-foreground">Sauvegarder automatiquement les données chaque jour</p>
                </div>
                <Switch id="auto-backup" defaultChecked />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  Créer une sauvegarde maintenant
                </Button>
                <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                  <Shield className="h-4 w-4" />
                  Restaurer une sauvegarde
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Historique des sauvegardes</Label>
                <div className="border rounded-md divide-y">
                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium">Sauvegarde complète</div>
                      <div className="text-sm text-muted-foreground">15/05/2023 à 03:00</div>
                    </div>
                    <Button variant="ghost" size="sm">Restaurer</Button>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium">Sauvegarde complète</div>
                      <div className="text-sm text-muted-foreground">14/05/2023 à 03:00</div>
                    </div>
                    <Button variant="ghost" size="sm">Restaurer</Button>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium">Sauvegarde complète</div>
                      <div className="text-sm text-muted-foreground">13/05/2023 à 03:00</div>
                    </div>
                    <Button variant="ghost" size="sm">Restaurer</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AdminSettingsPage; 