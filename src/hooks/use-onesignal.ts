"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface OneSignalHook {
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  showPrompt: () => void;
  sendTestNotification: () => void;
}

declare global {
  interface Window {
    OneSignal?: any;
  }
}

export function useOneSignal(): OneSignalHook {
  const { data } = useSession();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Vérifier l'état de l'abonnement
  useEffect(() => {
    const checkSubscription = async () => {
      if (window.OneSignal) {
        try {
          const subscribed = await window.OneSignal.isPushNotificationsEnabled();
          setIsSubscribed(subscribed);
        } catch (error) {
          console.error("Error checking subscription status:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    checkSubscription();
  }, []);

  // S'abonner aux notifications
  const subscribe = useCallback(async () => {
    if (!window.OneSignal) {
      console.error("OneSignal not initialized");
      return;
    }

    try {
      setIsLoading(true);
      
      // Demander la permission si nécessaire
      const permission = await window.OneSignal.getNotificationPermission();
      
      if (permission === "denied") {
        alert("Les notifications sont bloquées. Veuillez les autoriser dans les paramètres de votre navigateur.");
        return;
      }

      if (permission === "default") {
        await window.OneSignal.showHttpPrompt();
      }

      // S'abonner
      await window.OneSignal.setSubscription(true);
      
      // Obtenir le player ID
      const playerId = await window.OneSignal.getPlayerId();
      
      if (playerId && session?.user?.id) {
        // Enregistrer côté serveur
        const response = await fetch("/api/notifications/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId  })});

        if (response.ok) {
          setIsSubscribed(true);
        }
      }
    } catch (error) {
      console.error("Error subscribing to notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  // Se désabonner des notifications
  const unsubscribe = useCallback(async () => {
    if (!window.OneSignal) {
      console.error("OneSignal not initialized");
      return;
    }

    try {
      setIsLoading(true);
      
      // Se désabonner
      await window.OneSignal.setSubscription(false);
      
      // Notifier le serveur
      if (session?.user?.id) {
        await fetch("/api/notifications/subscribe", {
          method: "DELETE"});
      }
      
      setIsSubscribed(false);
    } catch (error) {
      console.error("Error unsubscribing from notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  // Afficher le prompt de notification
  const showPrompt = useCallback(() => {
    if (window.OneSignal) {
      window.OneSignal.showSlidedownPrompt();
    }
  }, []);

  // Envoyer une notification de test
  const sendTestNotification = useCallback(() => {
    if (window.OneSignal && isSubscribed) {
      // Créer une notification locale pour tester
      window.OneSignal.sendSelfNotification(
        "Test EcoDeli",
        "Ceci est une notification de test!",
        "https://ecodeli.me",
        "https://ecodeli.me/icon-192x192.png",
        {
          type: "test",
          timestamp: new Date().toISOString()}
      );
    }
  }, [isSubscribed]);

  return {
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    showPrompt,
    sendTestNotification};
}