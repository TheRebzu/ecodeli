"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSwitcher } from "@/components/common/language-switcher";
import {
  Menu,
  Bell,
  Search,
  User,
  Settings,
  LogOut,
  Shield,
  Users,
  AlertTriangle,
  BarChart3,
  Database,
  Activity,
  CheckCircle,
  HelpCircle,
} from "lucide-react";
import { signOut } from "next-auth/react";

interface AdminHeaderProps {
  user: {
    id: string;
    name?: string;
    email: string;
    role: string;
    avatar?: string;
    adminLevel?: "SUPER_ADMIN" | "ADMIN" | "MODERATOR";
  };
  onSidebarToggle?: () => void;
  notifications?: Array<{
    id: string;
    title: string;
    message: string;
    type: "info" | "success" | "warning" | "error";
    read: boolean;
    createdAt: Date;
    priority?: "low" | "medium" | "high" | "critical";
  }>;
  systemStatus?: {
    status: "healthy" | "warning" | "error";
    message?: string;
  };
}

export function AdminHeader({
  user,
  onSidebarToggle,
  notifications = [],
  systemStatus = { status: "healthy" },
}: AdminHeaderProps) {
  const [showSearch, setShowSearch] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const criticalCount = notifications.filter(
    (n) => !n.read && n.priority === "critical",
  ).length;

  const getAdminLevelBadge = () => {
    switch (user.adminLevel) {
      case "SUPER_ADMIN":
        return <Badge variant="destructive">Super Admin</Badge>;
      case "ADMIN":
        return (
          <Badge variant="default" className="bg-red-500 hover:bg-red-600">
            Admin
          </Badge>
        );
      default:
        return <Badge variant="outline">Modérateur</Badge>;
    }
  };

  const getSystemStatusIcon = () => {
    switch (systemStatus.status) {
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:bg-background/95">
      <div className="container flex h-16 items-center">
        {/* Menu mobile */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onSidebarToggle}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>

        {/* Logo (visible sur mobile uniquement) */}
        <Link
          href="/admin"
          className="flex items-center space-x-2 md:hidden ml-2"
        >
          <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
          <span className="font-bold text-xl">EcoDeli Admin</span>
        </Link>

        {/* Indicateur de statut système */}
        <div className="hidden md:flex items-center space-x-2 ml-4">
          {getSystemStatusIcon()}
          <span className="text-sm text-muted-foreground">
            {systemStatus.message || "Système opérationnel"}
          </span>
        </div>

        {/* Barre de recherche */}
        <div className="flex-1 flex items-center justify-center px-4">
          {showSearch ? (
            <div className="w-full max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Rechercher utilisateurs, livraisons..."
                  className="w-full pl-10 pr-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  autoFocus
                  onBlur={() => setShowSearch(false)}
                />
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSearch(true)}
              className="hidden md:flex items-center space-x-2 text-muted-foreground hover:text-foreground"
            >
              <Search className="h-4 w-4" />
              <span className="text-sm">Recherche globale...</span>
            </Button>
          )}
        </div>

        {/* Actions à droite */}
        <div className="flex items-center space-x-2">
          {/* Boutons d'action rapide */}
          <Button
            size="sm"
            variant="outline"
            asChild
            className="hidden sm:flex"
          >
            <Link href="/admin/validations">
              <CheckCircle className="h-4 w-4 mr-2" />
              Validations
            </Link>
          </Button>

          <Button
            size="sm"
            variant="outline"
            asChild
            className="hidden lg:flex"
          >
            <Link href="/admin/analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Link>
          </Button>

          {/* Recherche mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setShowSearch(true)}
          >
            <Search className="h-5 w-5" />
            <span className="sr-only">Search</span>
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge
                    variant={criticalCount > 0 ? "destructive" : "secondary"}
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
                <span className="sr-only">Notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                Notifications Admin
                {unreadCount > 0 && (
                  <div className="flex space-x-1">
                    {criticalCount > 0 && (
                      <Badge variant="destructive">
                        {criticalCount} critiques
                      </Badge>
                    )}
                    <Badge variant="secondary">{unreadCount} nouvelles</Badge>
                  </div>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  Aucune notification
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {notifications.slice(0, 5).map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className="flex flex-col items-start space-y-1 p-3"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium text-sm">
                          {notification.title}
                        </span>
                        <div className="flex items-center space-x-1">
                          {notification.priority === "critical" && (
                            <Badge variant="destructive" className="text-xs">
                              Critique
                            </Badge>
                          )}
                          {!notification.read && (
                            <div className="w-2 h-2 bg-red-500 rounded-full" />
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {notification.createdAt.toLocaleDateString()}
                      </span>
                    </DropdownMenuItem>
                  ))}
                  {notifications.length > 5 && (
                    <DropdownMenuItem asChild>
                      <Link
                        href="/admin/notifications"
                        className="text-center py-2"
                      >
                        Voir toutes les notifications
                      </Link>
                    </DropdownMenuItem>
                  )}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Language switcher */}
          <LanguageSwitcher />

          {/* Menu utilisateur */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={user.avatar}
                    alt={user.name || user.email}
                  />
                  <AvatarFallback>
                    {user.name
                      ? user.name.substring(0, 2).toUpperCase()
                      : user.email.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user.name || "Administrateur"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Shield className="h-3 w-3 text-red-500" />
                    {getAdminLevelBadge()}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/admin/profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>Mon profil</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/users">
                  <Users className="mr-2 h-4 w-4" />
                  <span>Gestion utilisateurs</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/cloud/monitoring">
                  <Activity className="mr-2 h-4 w-4" />
                  <span>Monitoring</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/settings/system">
                  <Database className="mr-2 h-4 w-4" />
                  <span>Système</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Paramètres</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/support">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  <span>Support</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut({ redirect: true, callbackUrl: "/login" })} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Se déconnecter</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
