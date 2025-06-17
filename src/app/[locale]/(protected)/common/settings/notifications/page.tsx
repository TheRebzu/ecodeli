"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  Mail, 
  Smartphone, 
  MessageSquare, 
  Settings, 
  Volume2,
  VolumeX,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";

export default function NotificationsPage() {
  const { data: session } = useSession();
  const [testingNotification, setTestingNotification] = useState(false);

  // Récupérer les préférences de notification
  const { data: preferences, refetch } = api.auth.getNotificationPreferences.useQuery();
  const { data: unreadCount } = api.notification.getUnreadCount.useQuery();

  // Mutations
  const updatePreferencesMutation = api.auth.updateNotificationPreferences.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Préférences mises à jour", {
        description: "Vos préférences de notifications ont été sauvegardées"
      });
    },
    onError: (error) => {
      toast.error("Erreur", {
        description: error.message || "Impossible de sauvegarder les préférences"
      });
    }
  });

  const testNotificationMutation = api.notification.sendTestNotification.useMutation({
    onSuccess: () => {
      toast.success("Notification de test envoyée", {
        description: "Vérifiez vos canaux de notification configurés"
      });
      setTestingNotification(false);
    },
    onError: (error) => {
      toast.error("Erreur", {
        description: error.message || "Impossible d'envoyer la notification de test"
      });
      setTestingNotification(false);
    }
  });

  const handlePreferenceChange = (type: string, channel: string, enabled: boolean) => {
    updatePreferencesMutation.mutate({
      type,
      channel,
      enabled
    });
  };

  const sendTestNotification = () => {
    setTestingNotification(true);
    testNotificationMutation.mutate();
  };

  const notificationTypes = [
    {
      id: "DELIVERY_UPDATES",
      title: "Livraisons",
      description: "Statut des livraisons, arrivées, confirmations",
      icon: Bell,
      priority: "high"
    },
    {
      id: "PAYMENT_NOTIFICATIONS",
      title: "Paiements",
      description: "Factures, paiements reçus, remboursements",
      icon: CheckCircle,
      priority: "high"
    },
    {
      id: "SERVICE_UPDATES",
      title: "Services",
      description: "Réservations, confirmations, modifications",
      icon: Settings,
      priority: "medium"
    },
    {
      id: "SECURITY_ALERTS",
      title: "Sécurité",
      description: "Connexions, changements de mot de passe",
      icon: AlertTriangle,
      priority: "high"
    },
    {
      id: "MARKETING",
      title: "Promotions",
      description: "Offres spéciales, nouveautés, événements",
      icon: MessageSquare,
      priority: "low"
    }
  ];

  const channels = [
    { id: "EMAIL", label: "Email", icon: Mail },
    { id: "PUSH", label: "Push", icon: Smartphone },
    { id: "SMS", label: "SMS", icon: MessageSquare }
  ];

  return (
    <div className="container mx-auto py-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Paramètres de notifications</h1>
          <p className="text-muted-foreground">
            Configurez comment vous souhaitez être notifié
          </p>
        </div>
        {unreadCount && unreadCount > 0 && (
          <Badge variant="secondary">
            {unreadCount} notification{unreadCount > 1 ? 's' : ''} non lue{unreadCount > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Aperçu global */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Statut global des notifications
          </CardTitle>
          <CardDescription>
            Aperçu de vos paramètres de notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {channels.map((channel) => {
              const enabledCount = notificationTypes.filter(type => 
                preferences?.[type.id]?.[channel.id] === true
              ).length;
              
              return (
                <div key={channel.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    enabledCount > 0 ? "bg-green-100" : "bg-gray-100"
                  }`}>
                    <channel.icon className={`h-4 w-4 ${
                      enabledCount > 0 ? "text-green-600" : "text-gray-400"
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium">{channel.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {enabledCount} type{enabledCount > 1 ? 's' : ''} activé{enabledCount > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Préférences détaillées */}
      <Card>
        <CardHeader>
          <CardTitle>Préférences par type de notification</CardTitle>
          <CardDescription>
            Choisissez comment vous souhaitez être notifié pour chaque type d'événement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {notificationTypes.map((type, index) => (
            <div key={type.id}>
              <div className="flex items-start space-x-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mt-1 ${
                  type.priority === 'high' ? 'bg-red-100' :
                  type.priority === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'
                }`}>
                  <type.icon className={`h-4 w-4 ${
                    type.priority === 'high' ? 'text-red-600' :
                    type.priority === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                  }`} />
                </div>
                
                <div className="flex-1 space-y-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{type.title}</h3>
                      {type.priority === 'high' && (
                        <Badge variant="destructive" className="text-xs">Priorité haute</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    {channels.map((channel) => (
                      <div key={channel.id} className="flex items-center space-x-2">
                        <Switch
                          id={`${type.id}-${channel.id}`}
                          checked={preferences?.[type.id]?.[channel.id] || false}
                          onCheckedChange={(checked) => 
                            handlePreferenceChange(type.id, channel.id, checked)
                          }
                          disabled={updatePreferencesMutation.isPending}
                        />
                        <Label htmlFor={`${type.id}-${channel.id}`} className="text-sm">
                          {channel.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {index < notificationTypes.length - 1 && <Separator className="mt-6" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Actions et test */}
      <Card>
        <CardHeader>
          <CardTitle>Actions et tests</CardTitle>
          <CardDescription>
            Testez vos paramètres et gérez vos notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              onClick={sendTestNotification}
              disabled={testingNotification || testNotificationMutation.isPending}
              className="justify-start"
            >
              {testingNotification ? (
                <VolumeX className="mr-2 h-4 w-4" />
              ) : (
                <Volume2 className="mr-2 h-4 w-4" />
              )}
              {testingNotification ? "Envoi en cours..." : "Tester les notifications"}
            </Button>
            
            <Button variant="outline" className="justify-start" asChild>
              <a href="/notifications">
                <Bell className="mr-2 h-4 w-4" />
                Voir toutes les notifications
              </a>
            </Button>
          </div>
          
          <Separator className="my-4" />
          
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Note :</strong> Les notifications de sécurité et de paiement ne peuvent pas être désactivées 
              pour des raisons de sécurité.
            </p>
            <p>
              Les notifications push nécessitent l'autorisation de votre navigateur ou de l'application mobile.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
