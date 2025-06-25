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
  Truck,
  MapPin,
  Calendar,
  Star,
  DollarSign
} from 'lucide-react';

interface DelivererHeaderProps {
  user: {
    name?: string;
    email: string;
    rating?: number;
    isVerified?: boolean;
  };
  onLogout: () => void;
  activeDeliveries?: number;
  pendingRequests?: number;
}

/**
 * Header pour les livreurs connectés
 */
export function DelivererHeader({ 
  user, 
  onLogout, 
  activeDeliveries = 0,
  pendingRequests = 0 
}: DelivererHeaderProps) {
  const t = useTranslations('navigation');
  const common = useTranslations('common');
  const dashboard = useTranslations('dashboard');

  const getVerificationBadge = () => {
    if (user.isVerified) {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          Vérifié
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-orange-600 border-orange-300">
        En attente
      </Badge>
    );
  };

  return (
    <header className="border-b bg-blue-50 border-blue-200">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo + Navigation */}
          <div className="flex items-center space-x-8">
            <Link href="/deliverer" className="flex items-center space-x-2">
              <Truck className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-bold text-blue-800">EcoDeli</span>
            </Link>

            <nav className="hidden md:flex items-center space-x-6">
              <Link 
                href="/deliverer" 
                className="text-sm font-medium text-blue-700 hover:text-blue-900 transition-colors"
              >
                {dashboard('overview')}
              </Link>
              <Link 
                href="/deliverer/deliveries" 
                className="text-sm font-medium text-blue-700 hover:text-blue-900 transition-colors flex items-center"
              >
                <Package className="h-4 w-4 mr-1" />
                {t('deliveries')}
                {activeDeliveries > 0 && (
                  <Badge variant="default" className="ml-2 text-xs bg-blue-600">
                    {activeDeliveries}
                  </Badge>
                )}
              </Link>
              <Link 
                href="/deliverer/routes" 
                className="text-sm font-medium text-blue-700 hover:text-blue-900 transition-colors"
              >
                <MapPin className="h-4 w-4 inline mr-1" />
                {t('routes')}
              </Link>
              <Link 
                href="/deliverer/schedule" 
                className="text-sm font-medium text-blue-700 hover:text-blue-900 transition-colors"
              >
                <Calendar className="h-4 w-4 inline mr-1" />
                {t('schedule')}
              </Link>
              <Link 
                href="/deliverer/earnings" 
                className="text-sm font-medium text-blue-700 hover:text-blue-900 transition-colors"
              >
                <DollarSign className="h-4 w-4 inline mr-1" />
                {t('earnings')}
              </Link>
            </nav>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <LanguageSwitcher />
            
            {/* Rating Display */}
            {user.rating && (
              <div className="hidden md:flex items-center space-x-1 text-blue-700">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">{user.rating.toFixed(1)}</span>
              </div>
            )}

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              {pendingRequests > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {pendingRequests}
                </Badge>
              )}
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <Truck className="h-4 w-4 text-blue-600" />
                  <span className="hidden md:block text-blue-800">{user.name || user.email}</span>
                  {getVerificationBadge()}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-blue-800">{t('deliverer_space')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <DropdownMenuItem asChild>
                  <Link href="/deliverer/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    {common('profile')}
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild>
                  <Link href="/deliverer/verification" className="flex items-center">
                    <Star className="mr-2 h-4 w-4" />
                    {t('verification')}
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild>
                  <Link href="/deliverer/vehicle" className="flex items-center">
                    <Truck className="mr-2 h-4 w-4" />
                    {t('vehicle')}
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild>
                  <Link href="/deliverer/settings" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    {common('settings')}
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