import { NotificationProvider } from '@/context/notification-context';
import { LanguageProvider } from '@/context/language-context';
import { ThemeProvider } from '@/context/theme-context';
import { TRPCProvider } from './trpc-provider';

export function AppProviders({ children }) {
  return (
    <TRPCProvider>
      <ThemeProvider>
        <LanguageProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </LanguageProvider>
      </ThemeProvider>
    </TRPCProvider>
  );
}