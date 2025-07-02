import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { ThemeToggle } from '@/components/ui/theme-toggle';
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
  Shield,
  Users,
  FileText,
  BarChart3,
  Database,
  AlertTriangle
} from 'lucide-react';

interface AdminHeaderProps {
  user: {
    name?: string;
    email: string;
  };
  onLogout: () => void;
  pendingValidations?: number;
  systemAlerts?: number;
}

/**
 * Header pour les administrateurs
 */
export function AdminHeader({ user, onLogout, pendingValidations, systemAlerts }: AdminHeaderProps) {
  const t = useTranslations('navigation');
  const common = useTranslations('common');
  const admin = useTranslations('admin');

  return (
    <header className="border-b bg-red-50 border-red-200">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo + Navigation */}
          <div className="flex items-center space-x-8">
            <Link href="/admin" className="flex items-center space-x-2">
              <Shield className="h-6 w-6 text-red-600" />
              <span className="text-xl font-bold text-red-800">EcoDeli Admin</span>
            </Link>

            <nav className="hidden lg:flex items-center space-x-6">
              <Link 
                href="/admin" 
                className="text-sm font-medium text-red-700 hover:text-red-900 transition-colors"
              >
                {admin('dashboard')}
              </Link>
              <Link 
                href="/admin/users" 
                className="text-sm font-medium text-red-700 hover:text-red-900 transition-colors flex items-center"
              >
                <Users className="h-4 w-4 mr-1" />
                {admin('users')}
                {pendingValidations > 0 && (
                  <Badge variant="destructive" className="ml-2 text-xs">
                    {pendingValidations}
                  </Badge>
                )}
              </Link>
              <Link 
                href="/admin/deliveries" 
                className="text-sm font-medium text-red-700 hover:text-red-900 transition-colors"
              >
                {admin('deliveries')}
              </Link>
              <Link 
                href="/admin/finance" 
                className="text-sm font-medium text-red-700 hover:text-red-900 transition-colors"
              >
                <BarChart3 className="h-4 w-4 inline mr-1" />
                {admin('finance')}
              </Link>
              <Link 
                href="/admin/monitoring" 
                className="text-sm font-medium text-red-700 hover:text-red-900 transition-colors flex items-center"
              >
                <Database className="h-4 w-4 mr-1" />
                {admin('monitoring')}
                {systemAlerts > 0 && (
                  <AlertTriangle className="h-4 w-4 text-orange-500 ml-1" />
                )}
              </Link>
            </nav>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <LanguageSwitcher />
            
            {/* System Status */}
            <div className="hidden md:flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-gray-600">System OK</span>
              </div>
            </div>

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              {(pendingValidations + systemAlerts) > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {pendingValidations + systemAlerts}
                </Badge>
              )}
            </Button>

            {/* Admin Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-red-600" />
                  <span className="hidden md:block text-red-800">{user.name || 'Admin'}</span>
                  <Badge variant="destructive" className="text-xs">
                    ADMIN
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-red-800">{admin('admin_panel')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <DropdownMenuItem asChild>
                  <Link href="/admin/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    {common('profile')}
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild>
                  <Link href="/admin/settings" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    {admin('system_settings')}
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild>
                  <Link href="/admin/logs" className="flex items-center">
                    <FileText className="mr-2 h-4 w-4" />
                    {admin('system_logs')}
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