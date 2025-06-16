"use client";

import { useState } from "react";
import { Bell, BellOff, Loader2, Smartphone } from "lucide-react";
import { useOneSignal } from "@/hooks/use-onesignal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

export function PushNotificationSettings() {
  const { isSubscribed, isLoading, subscribe, unsubscribe, showPrompt, sendTestNotification } = useOneSignal();
  const [testLoading, setTestLoading] = useState(false);

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      await subscribe();
    } else {
      await unsubscribe();
    }
  };

  const handleTestNotification = async () => {
    setTestLoading(true);
    sendTestNotification();
    setTimeout(() => setTestLoading(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications Push
        </CardTitle>
        <CardDescription>
          Recevez des notifications en temps réel pour vos livraisons, messages et rappels importants
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-notifications" className="text-base">
              Activer les notifications push
            </Label>
            <div className="text-sm text-muted-foreground">
              Restez informé même lorsque vous n'êtes pas sur le site
            </div>
          </div>
          <Switch
            id="push-notifications"
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            disabled={isLoading}
          />
        </div>

        {isSubscribed && (
          <>
            <Separator />
            
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Types de notifications</h4>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="delivery-notifications" className="font-normal">
                    Mises à jour de livraison
                  </Label>
                  <Switch id="delivery-notifications" defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="message-notifications" className="font-normal">
                    Nouveaux messages
                  </Label>
                  <Switch id="message-notifications" defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="payment-notifications" className="font-normal">
                    Paiements et factures
                  </Label>
                  <Switch id="payment-notifications" defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="reminder-notifications" className="font-normal">
                    Rappels de rendez-vous
                  </Label>
                  <Switch id="reminder-notifications" defaultChecked />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={handleTestNotification}
                disabled={testLoading}
                className="w-full"
              >
                {testLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Smartphone className="mr-2 h-4 w-4" />
                    Envoyer une notification de test
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {!isSubscribed && (
          <Alert>
            <BellOff className="h-4 w-4" />
            <AlertDescription>
              Les notifications push sont désactivées. Activez-les pour ne manquer aucune information importante.
            </AlertDescription>
          </Alert>
        )}

        <div className="pt-2">
          <p className="text-xs text-muted-foreground">
            Les notifications push nécessitent l'autorisation de votre navigateur. 
            Vous pouvez modifier ces paramètres à tout moment dans les réglages de votre navigateur.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}