import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Settings, Save, Server, Bell, Shield, CreditCard } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Paramètres</h1>
        <p className="text-slate-500">
          Gérez les paramètres de l&apos;application
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>Général</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Sécurité</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span>Paiements</span>
          </TabsTrigger>
          <TabsTrigger value="server" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            <span>Serveur</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Paramètres généraux</CardTitle>
                <CardDescription>
                  Configurez les paramètres généraux de l&apos;application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="site-name">Nom du site</Label>
                  <Input
                    id="site-name"
                    placeholder="Eco Deli"
                    defaultValue="Eco Deli"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="site-description">Description</Label>
                  <Input
                    id="site-description"
                    placeholder="Livraison éco-responsable"
                    defaultValue="Livraison éco-responsable pour commerces locaux"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="maintenance-mode">Mode maintenance</Label>
                    <p className="text-muted-foreground text-sm">
                      Activez le mode maintenance pour bloquer l&apos;accès au site pendant les travaux
                    </p>
                  </div>
                  <Switch id="maintenance-mode" />
                </div>
              </CardContent>
              <CardFooter>
                <Button className="ml-auto gap-2">
                  <Save className="h-4 w-4" />
                  <span>Enregistrer</span>
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Configuration des délais</CardTitle>
                <CardDescription>
                  Définissez les délais par défaut pour les différentes opérations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="delivery-time">Délai de livraison par défaut (heures)</Label>
                  <Input
                    id="delivery-time"
                    type="number"
                    placeholder="24"
                    defaultValue="24"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="approval-time">Délai d&apos;approbation (heures)</Label>
                  <Input
                    id="approval-time"
                    type="number"
                    placeholder="48"
                    defaultValue="48"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button className="ml-auto gap-2">
                  <Save className="h-4 w-4" />
                  <span>Enregistrer</span>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres de sécurité</CardTitle>
              <CardDescription>
                Configurez les paramètres de sécurité de l&apos;application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="two-factor">Authentification à deux facteurs</Label>
                  <p className="text-muted-foreground text-sm">
                    Exiger l&apos;authentification à deux facteurs pour tous les administrateurs
                  </p>
                </div>
                <Switch id="two-factor" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="session-timeout">Expiration de session</Label>
                  <p className="text-muted-foreground text-sm">
                    Déconnecter les utilisateurs après une période d&apos;inactivité
                  </p>
                </div>
                <Switch id="session-timeout" defaultChecked />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeout-duration">Durée d&apos;inactivité (minutes)</Label>
                <Input
                  id="timeout-duration"
                  type="number"
                  placeholder="30"
                  defaultValue="30"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="ml-auto gap-2">
                <Save className="h-4 w-4" />
                <span>Enregistrer</span>
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres de notifications</CardTitle>
              <CardDescription>
                Configurez les paramètres de notifications de l&apos;application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Notifications par email</Label>
                  <p className="text-muted-foreground text-sm">
                    Envoyer des notifications par email
                  </p>
                </div>
                <Switch id="email-notifications" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sms-notifications">Notifications par SMS</Label>
                  <p className="text-muted-foreground text-sm">
                    Envoyer des notifications par SMS
                  </p>
                </div>
                <Switch id="sms-notifications" />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-notifications">Notifications push</Label>
                  <p className="text-muted-foreground text-sm">
                    Envoyer des notifications push via l&apos;application
                  </p>
                </div>
                <Switch id="push-notifications" defaultChecked />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="ml-auto gap-2">
                <Save className="h-4 w-4" />
                <span>Enregistrer</span>
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres de paiement</CardTitle>
              <CardDescription>
                Configurez les paramètres de paiement de l&apos;application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payment-gateway">Passerelle de paiement</Label>
                <Input
                  id="payment-gateway"
                  placeholder="Stripe"
                  defaultValue="Stripe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-key">Clé API</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="sk_test_..."
                  defaultValue="sk_test_123456789"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="test-mode">Mode test</Label>
                  <p className="text-muted-foreground text-sm">
                    Utiliser la passerelle de paiement en mode test
                  </p>
                </div>
                <Switch id="test-mode" defaultChecked />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="ml-auto gap-2">
                <Save className="h-4 w-4" />
                <span>Enregistrer</span>
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="server">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres serveur</CardTitle>
              <CardDescription>
                Configurez les paramètres serveur de l&apos;application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="database-url">URL de la base de données</Label>
                <Input
                  id="database-url"
                  placeholder="postgresql://..."
                  defaultValue="postgresql://username:password@localhost:5432/ecodeli"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="redis-url">URL Redis</Label>
                <Input
                  id="redis-url"
                  placeholder="redis://..."
                  defaultValue="redis://localhost:6379"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="log-level">Niveau de journalisation</Label>
                <Input
                  id="log-level"
                  placeholder="info"
                  defaultValue="info"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="ml-auto gap-2">
                <Save className="h-4 w-4" />
                <span>Enregistrer</span>
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 