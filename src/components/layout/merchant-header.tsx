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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Package, 
  Bell, 
  User, 
  Settings, 
  LogOut,
  Store,
  ShoppingBag,
  BarChart3,
  CreditCard,
  Calendar,
  Menu
} from 'lucide-react';
import { MerchantHeaderProps } from './types';
import { cn } from '@/lib/utils';

/**
 * Header pour l'espace commerçant
 */
export function MerchantHeader({
  user,
  onLogout,
  pendingOrders = 0,
  newMessages = 0,
  className
}: MerchantHeaderProps) {
  const t = useTranslations('navigation');
  const common = useTranslations('common');

  const navigationItems = [
    { href: '/merchant/dashboard', label: t('dashboard'), icon: BarChart3 },
    { href: '/merchant/orders', label: t('orders'), icon: ShoppingBag },
    { href: '/merchant/cart-drop', label: t('cart_drop'), icon: Package },
    { href: '/merchant/contract', label: t('contract'), icon: CreditCard },
    { href: '/merchant/analytics', label: t('analytics'), icon: BarChart3 },
  ];

  return (
    <header className={cn("sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60", className)}>
      <div className="container flex h-14 items-center">
        {/* Logo */}
        <div className="mr-4 hidden md:flex">
          <Link href="/merchant/dashboard" className="mr-6 flex items-center space-x-2">
            <Store className="h-6 w-6 text-orange-600" />
            <span className="hidden font-bold sm:inline-block">
              EcoDeli <span className="text-orange-600">Business</span>
            </span>
          </Link>
        </div>

        {/* Mobile menu */}
        <Button variant="ghost" size="icon" className="mr-2 md:hidden">
          <Menu className="h-5 w-5" />
        </Button>

        {/* Navigation */}
        <nav className="flex items-center space-x-6 text-sm font-medium hidden md:flex">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center space-x-2"
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          {/* Quick Stats */}
          <div className="hidden lg:flex items-center space-x-4 mr-4">
            {/* Store Name */}
            {user.storeName && (
              <div className="flex items-center space-x-2 text-sm">
                <Store className="h-4 w-4 text-orange-600" />
                <span className="font-medium text-orange-600">{user.storeName}</span>
              </div>
            )}

            {/* Pending Orders */}
            {pendingOrders > 0 && (
              <div className="flex items-center space-x-2 text-sm">
                <ShoppingBag className="h-4 w-4 text-blue-600" />
                <span className="text-muted-foreground">{common('pending')}:</span>
                <Badge variant="secondary">{pendingOrders}</Badge>
              </div>
            )}
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            {(pendingOrders > 0 || newMessages > 0) && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs" variant="destructive">
                {pendingOrders + newMessages > 9 ? '9+' : pendingOrders + newMessages}
              </Badge>
            )}
          </Button>

          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar} alt={user.name || user.email} />
                  <AvatarFallback>
                    {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {user.isVerified && (
                  <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user.name || common('merchant')}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                  {user.storeName && (
                    <p className="text-xs leading-none text-orange-600 font-medium">
                      {user.storeName}
                    </p>
                  )}
                  <div className="flex items-center space-x-2 pt-1">
                    {user.isVerified && (
                      <Badge variant="secondary" className="text-xs">
                        {common('verified')}
                      </Badge>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem asChild>
                <Link href="/merchant/profile" className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  <span>{common('profile')}</span>
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuItem asChild>
                <Link href="/merchant/contract" className="flex items-center">
                  <CreditCard className="mr-2 h-4 w-4" />
                  <span>{common('contract')}</span>
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuItem asChild>
                <Link href="/merchant/billing" className="flex items-center">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  <span>{common('billing')}</span>
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuItem asChild>
                <Link href="/merchant/settings" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>{common('settings')}</span>
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                className="text-red-600 focus:text-red-600"
                onClick={onLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>{common('logout')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
} 