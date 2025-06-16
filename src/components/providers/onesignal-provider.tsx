"use client";

import { ReactNode, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Script from "next/script";

interface OneSignalProviderProps {
  children: ReactNode;
}

declare global {
  interface Window {
    OneSignal?: any;
  }
}

export function OneSignalProvider({ children }: OneSignalProviderProps) {
  const { data: session, status } = useSession();

  const initOneSignal = useCallback(() => {
    if (typeof window === "undefined" || window.OneSignal) return;

    const oneSignalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

    if (!oneSignalAppId) {
      if (process.env.NODEENV === "development") {
        console.log("OneSignal: App ID not configured (skipping in dev)");
      }
      return;
    }

    window.OneSignal = window.OneSignal || [];
    
    window.OneSignal.push(() => {
      window.OneSignal.init({
        appId: oneSignalAppId, safari_web_id: process.env.NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID,
        notifyButton: {
          enable: true,
          position: "bottom-right",
          text: {
            "tip.state.unsubscribed": "S'abonner aux notifications",
            "tip.state.subscribed": "Vous êtes abonné aux notifications",
            "tip.state.blocked": "Vous avez bloqué les notifications",
            "message.prenotify": "Cliquez pour recevoir des notifications",
            "message.action.subscribed": "Merci de vous être abonné!",
            "message.action.resubscribed": "Vous êtes abonné aux notifications",
            "message.action.unsubscribed": "Vous ne recevrez plus de notifications",
            "dialog.main.title": "Gérer les notifications",
            "dialog.main.button.subscribe": "S'ABONNER",
            "dialog.main.button.unsubscribe": "SE DÉSABONNER",
            "dialog.blocked.title": "Débloquer les notifications",
            "dialog.blocked.message": "Suivez ces instructions pour autoriser les notifications:"
          }
        },
        promptOptions: {
          slidedown: {
            prompts: [
              {
                type: "push",
                autoPrompt: false,
                text: {
                  actionMessage: "Recevez des notifications pour vos livraisons et messages importants",
                  acceptButton: "Autoriser",
                  cancelButton: "Plus tard"
                }
              }
            ]
          }
        },
        welcomeNotification: {
          title: "Bienvenue sur EcoDeli!",
          message: "Vous recevrez maintenant des notifications importantes.",
          disable: false
        }
      });

      // Définir les tags utilisateur si connecté
      if (status === "authenticated" && session?.user?.id) {
        window.OneSignal.setExternalUserId(session.user.id);
        window.OneSignal.sendTag("userId", session.user.id);
        window.OneSignal.sendTag("role", session.user.role);
        
        // Tags supplémentaires selon le rôle
        if (session.user.role === "DELIVERER") {
          window.OneSignal.sendTag("isDeliverer", "true");
        } else if (session.user.role === "CLIENT") {
          window.OneSignal.sendTag("isClient", "true");
        } else if (session.user.role === "MERCHANT") {
          window.OneSignal.sendTag("isMerchant", "true");
        } else if (session.user.role === "PROVIDER") {
          window.OneSignal.sendTag("isProvider", "true");
        }
      }

      // Événements personnalisés
      window.OneSignal.on("subscriptionChange", (isSubscribed: boolean) => {
        console.log("OneSignal subscription changed:", isSubscribed);
        if (isSubscribed && session?.user?.id) {
          // Enregistrer l'abonnement côté serveur
          fetch("/api/notifications/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: session.user.id  })
          });
        }
      });

      window.OneSignal.on("notificationDisplay", (event: any) => {
        console.log("OneSignal notification displayed:", event);
      });
    });
  }, [session, status]);

  useEffect(() => {
    if (status === "authenticated" && window.OneSignal) {
      initOneSignal();
    }
  }, [status, initOneSignal]);

  return (
    <>
      <Script
        src="https://cdn.onesignal.com/sdks/OneSignalSDK.js"
        async
        onLoad={initOneSignal}
      />
      {children}
    </>
  );
}
