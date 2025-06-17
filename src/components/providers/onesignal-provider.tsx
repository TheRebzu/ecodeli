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
      if (process.env.NODE_ENV === "development") {
        console.log("OneSignal: App ID not configured (skipping in dev)");
      }
      return;
    }

    window.OneSignal = window.OneSignal || [];
    
    window.OneSignal.push(() => {
      window.OneSignal.init({
        appId: oneSignalAppId, 
        safari_web_id: process.env.NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID,
        allowLocalhostAsSecureOrigin: process.env.NODE_ENV === "development",
        notifyButton: {
          enable: true,
          position: "bottom-right",
          size: "medium",
          theme: "default",
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
                  actionMessage: "Recevez des notifications en temps réel pour vos livraisons, messages et mises à jour importantes",
                  acceptButton: "Autoriser les notifications",
                  cancelButton: "Plus tard"
                },
                delay: {
                  pageViews: 2,
                  timeDelay: 10
                }
              }
            ]
          }
        },
        welcomeNotification: {
          title: "🎉 Bienvenue sur EcoDeli!",
          message: "Vous recevrez maintenant des notifications importantes en temps réel.",
          url: window.location.origin,
          disable: false
        },
        serviceWorkerParam: {
          scope: "/push/onesignal/"
        }
      });

      // Configurer les tags utilisateur si connecté
      if (status === "authenticated" && session?.user?.id) {
        // ID externe pour ciblage précis
        window.OneSignal.setExternalUserId(session.user.id);
        
        // Tags de base
        window.OneSignal.sendTags({
          userId: session.user.id,
          role: session.user.role,
          userType: session.user.role.toLowerCase(),
          language: session.user.locale || "fr",
          joinDate: new Date().toISOString().split('T')[0],
          lastActive: new Date().toISOString()
        });
        
        // Tags spécifiques selon le rôle
        const roleTags: Record<string, any> = {};
        if (session.user.role === "DELIVERER") {
          roleTags.isDeliverer = "true";
          roleTags.notificationTypes = "delivery,payment,route";
        } else if (session.user.role === "CLIENT") {
          roleTags.isClient = "true";
          roleTags.notificationTypes = "delivery,service,payment,storage";
        } else if (session.user.role === "MERCHANT") {
          roleTags.isMerchant = "true";
          roleTags.notificationTypes = "order,payment,delivery";
        } else if (session.user.role === "PROVIDER") {
          roleTags.isProvider = "true";
          roleTags.notificationTypes = "booking,payment,review";
        } else if (session.user.role === "ADMIN") {
          roleTags.isAdmin = "true";
          roleTags.notificationTypes = "system,alert,report";
        }
        
        window.OneSignal.sendTags(roleTags);
        
        // Paramètres avancés pour le ciblage géographique
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              window.OneSignal.sendTags({
                latitude: position.coords.latitude.toString(),
                longitude: position.coords.longitude.toString(),
                locationEnabled: "true"
              });
            },
            () => {
              window.OneSignal.sendTag("locationEnabled", "false");
            }
          );
        }
      }

      // Événements personnalisés avancés
      window.OneSignal.on("subscriptionChange", async (isSubscribed: boolean) => {
        console.log("OneSignal subscription changed:", isSubscribed);
        
        if (isSubscribed && session?.user?.id) {
          try {
            // Récupérer le Player ID pour un ciblage précis
            const playerId = await window.OneSignal.getPlayerId();
            
            // Enregistrer l'abonnement côté serveur avec Player ID
            const response = await fetch("/api/notifications/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                userId: session.user.id,
                playerId: playerId,
                role: session.user.role
              })
            });
            
            if (response.ok) {
              console.log("OneSignal subscription enregistrée côté serveur");
              
              // Envoyer une notification de bienvenue personnalisée
              window.OneSignal.sendTag("subscriptionStatus", "active");
              window.OneSignal.sendTag("subscriptionDate", new Date().toISOString());
            }
          } catch (error) {
            console.error("Erreur lors de l'enregistrement OneSignal:", error);
          }
        } else if (!isSubscribed) {
          // Gérer la désinscription
          window.OneSignal.sendTag("subscriptionStatus", "inactive");
        }
      });

      window.OneSignal.on("notificationDisplay", (event: any) => {
        console.log("OneSignal notification displayed:", event);
        
        // Tracking des impressions de notifications
        if (event.id && session?.user?.id) {
          fetch("/api/analytics/notification-impression", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              notificationId: event.id,
              userId: session.user.id,
              type: "display"
            })
          }).catch(console.error);
        }
      });

      window.OneSignal.on("notificationClick", (event: any) => {
        console.log("OneSignal notification clicked:", event);
        
        // Tracking des clics de notifications
        if (event.id && session?.user?.id) {
          fetch("/api/analytics/notification-impression", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              notificationId: event.id,
              userId: session.user.id,
              type: "click",
              url: event.url
            })
          }).catch(console.error);
        }
      });

      window.OneSignal.on("permissionChange", (permission: boolean) => {
        console.log("OneSignal permission changed:", permission);
        window.OneSignal.sendTag("permissionGranted", permission.toString());
      });

      // Gestion des notifications en arrière-plan
      window.OneSignal.on("notificationPermissionChange", (permission: any) => {
        console.log("OneSignal permission state:", permission);
        
        if (permission.to === "granted") {
          window.OneSignal.sendTag("notificationPermission", "granted");
          // Afficher un message de confirmation si nécessaire
        } else if (permission.to === "denied") {
          window.OneSignal.sendTag("notificationPermission", "denied");
        }
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
