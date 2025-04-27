'use client';

import { ReactNode, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import OneSignal from 'react-onesignal';

interface OneSignalProviderProps {
  children: ReactNode;
}

export function OneSignalProvider({ children }: OneSignalProviderProps) {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const oneSignalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

      if (!oneSignalAppId) {
        console.warn('OneSignal App ID not configured');
        return;
      }

      OneSignal.init({ appId: oneSignalAppId }).then(() => {
        console.log('OneSignal initialized');

        // Si l'utilisateur est connecté, définir son ID utilisateur comme tag
        if (status === 'authenticated' && session?.user?.id) {
          OneSignal.setExternalUserId(session.user.id);
          OneSignal.sendTag('userId', session.user.id);
          OneSignal.sendTag('role', session.user.role);
        }
      });

      return () => {
        // Cleanup
        OneSignal.removeExternalUserId();
      };
    }
  }, [session, status]);

  return <>{children}</>;
}
