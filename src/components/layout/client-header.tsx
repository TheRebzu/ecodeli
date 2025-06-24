import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Bell, 
  User, 
  Settings, 
  LogOut,
  CreditCard,
  Truck,
  Calendar,
  Box
} from 'lucide-react';

interface ClientHeaderProps {
  user: {
    name?: string;
    email: string;
    subscription?: 'FREE' | 'STARTER' | 'PREMIUM';
  };
  onLogout: () => void;
}

/**
 * Header pour les clients connectés
 */
export function ClientHeader({ user, onLogout }: ClientHeaderProps) {
  const t = useTranslations('navigation');
  const common = useTranslations('common');
  const dashboard = useTranslations('dashboard');

  const getSubscriptionColor = (plan?: string) => {
    switch (plan) {
      case 'PREMIUM': return 'bg-purple-500';
      case 'STARTER': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo + Navigation */}
          <div className="flex items-center space-x-8">
            <Link href="/client" className="flex items-center space-x-2">
              <Package className="h-6 w-6 text-green-600" />
              <span className="text-xl font-bold">EcoDeli</span>
            </Link>

            <nav className="hidden md:flex items-center space-x-6">
              <Link 
                href="/client" 
                className="text-sm font-medium hover:text-green-600 transition-colors"
              >
                {dashboard('overview')}
              </Link>
              <Link 
                href="/client/announcements" 
                className="text-sm font-medium hover:text-green-600 transition-colors"
              >
                {t('announcements')}
              </Link>
              <Link 
                href="/client/deliveries" 
                className="text-sm font-medium hover:text-green-600 transition-colors"
              >
                {t('deliveries')}
              </Link>
              <Link 
                href="/client/bookings" 
                className="text-sm font-medium hover:text-green-600 transition-colors"
              >
                {t('bookings')}
              </Link>
              <Link 
                href="/client/storage" 
                className="text-sm font-medium hover:text-green-600 transition-colors"
              >
                <Box className="h-4 w-4 inline mr-1" />
                {t('storage')}
              </Link>
            </nav>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <LanguageSwitcher />
            
            {/* Notifications */}
            <Button variant="ghost" size="icon">
              <Bell className="h-4 w-4" />
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span className="hidden md:block">{user.name || user.email}</span>
                  {user.subscription && (
                    <Badge 
                      variant="secondary" 
                      className={`text-white ${getSubscriptionColor(user.subscription)}`}
                    >
                      {user.subscription}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{common('my_account')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <DropdownMenuItem asChild>
                  <Link href="/client/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    {common('profile')}
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild>
                  <Link href="/client/subscription" className="flex items-center">
                    <CreditCard className="mr-2 h-4 w-4" />
                    {t('subscription')}
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild>
                  <Link href="/client/tracking" className="flex items-center">
                    <Truck className="mr-2 h-4 w-4" />
                    {t('tracking')}
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={onLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  {common('logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
} 