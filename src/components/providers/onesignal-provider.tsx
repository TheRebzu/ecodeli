"use client";

import { ReactNode, useEffect } from "react";
import { useSession } from "next-auth/react";

interface OneSignalProviderProps {
  children: ReactNode;
}

export function OneSignalProvider({ children }: OneSignalProviderProps) {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const oneSignalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

      if (!oneSignalAppId) {
        if (process.env.NODE_ENV === "production") {
          console.warn("OneSignal App ID not configured");
        }
        return;
      }

      // Initialisation OneSignal seulement si configuré et en production
      if (process.env.NODE_ENV === "production") {
        // TODO: Installer react-onesignal et décommenter le code suivant
        /*
        OneSignal.init({ appId: oneSignalAppId }).then(() => {
          console.log('OneSignal initialized');

          // Si l'utilisateur est connecté, définir son ID utilisateur comme tag
          if (status === 'authenticated' && session?.user?.id) {
            OneSignal.setExternalUserId(session.user.id);
            OneSignal.sendTag('userId', session.user.id);
            OneSignal.sendTag('role', session.user.role);
          }
        });
        */
      }
    }
  }, [session, status]);

  return <>{children}</>;
}
