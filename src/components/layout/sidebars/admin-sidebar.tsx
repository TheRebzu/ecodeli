'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users,
  Package,
  CreditCard,
  BarChart3,
  Settings,
  Megaphone,
  Bell,
  FileCheck,
  CheckSquare,
  Warehouse,
  ChevronRight,
  ShoppingBag,
  Building,
  Receipt,
  PieChart,
  Building2,
  Truck,
  HardHat,
  Briefcase,
  FileText,
  Shield,
  LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface AdminSidebarProps {
  locale: string;
}

interface NavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  tooltip?: string;
}

interface NavigationSection {
  section: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  tooltip?: string;
  children: Array<NavigationItem>;
}

type SidebarItem = NavigationItem | NavigationSection;

// Type guard pour distinguer entre NavigationItem et NavigationSection
function isNavigationItem(item: SidebarItem): item is NavigationItem {
  return 'href' in item && !('section' in item);
}

export function AdminSidebar({ locale }: AdminSidebarProps) {
  const pathname = usePathname();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    users: false,
    verifications: true,
    partners: false,
    finance: false,
    operations: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const navigationItems: SidebarItem[] = [
    {
      label: 'Tableau de bord',
      href: `/${locale}/admin`,
      icon: BarChart3,
      tooltip: "Vue d'ensemble des activités et statistiques",
    },
    {
      section: 'users',
      label: 'Utilisateurs',
      icon: Users,
      tooltip: 'Gestion des comptes utilisateurs',
      children: [
        {
          label: 'Tous les utilisateurs',
          href: `/${locale}/admin/users`,
          icon: Users,
        },
        {
          label: 'Nouveaux utilisateurs',
          href: `/${locale}/admin/users/new`,
          icon: Users,
          badge: 5,
        },
      ],
    },
    {
      section: 'verifications',
      label: 'Vérifications',
      icon: FileCheck,
      badge: 12,
      tooltip: 'Validation des documents et profils',
      children: [
        {
          label: 'Demandes en attente',
          href: `/${locale}/admin/verifications`,
          icon: FileCheck,
          badge: 12,
        },
        {
          label: 'Vérifications livreurs',
          href: `/${locale}/admin/deliverers/verifications`,
          icon: FileCheck,
          badge: 7,
        },
        {
          label: 'Vérifications prestataires',
          href: `/${locale}/admin/providers/verifications`,
          icon: FileCheck,
          badge: 5,
        },
      ],
    },
    {
      label: 'Livraisons',
      href: `/${locale}/admin/deliveries`,
      icon: Package,
      badge: 3,
      tooltip: 'Suivi et gestion des livraisons en cours',
    },
    {
      section: 'partners',
      label: 'Partenaires',
      icon: Briefcase,
      tooltip: 'Gestion des partenaires de la plateforme',
      children: [
        {
          label: 'Livreurs',
          href: `/${locale}/admin/deliverers`,
          icon: Truck,
          badge: 2,
        },
        {
          label: 'Commerçants',
          href: `/${locale}/admin/merchants`,
          icon: Building,
        },
        {
          label: 'Prestataires',
          href: `/${locale}/admin/providers`,
          icon: HardHat,
        },
        {
          label: 'Contrats',
          href: `/${locale}/admin/merchants/contracts`,
          icon: FileText,
        },
      ],
    },
    {
      section: 'finance',
      label: 'Finance',
      icon: CreditCard,
      tooltip: 'Gestion financière et comptabilité',
      children: [
        {
          label: 'Factures',
          href: `/${locale}/admin/invoices`,
          icon: Receipt,
        },
        {
          label: 'Paiements',
          href: `/${locale}/admin/payments`,
          icon: CreditCard,
          badge: 8,
        },
        {
          label: 'Rapports financiers',
          href: `/${locale}/admin/reports`,
          icon: PieChart,
        },
        {
          label: 'Commissions',
          href: `/${locale}/admin/commissions`,
          icon: BarChart3,
        },
      ],
    },
    {
      label: 'Marketing',
      href: `/${locale}/admin/announcements`,
      icon: Megaphone,
      badge: 3,
      tooltip: 'Création et gestion des annonces',
    },
    {
      section: 'operations',
      label: 'Opérations',
      icon: Building2,
      tooltip: 'Gestion des opérations quotidiennes',
      children: [
        {
          label: 'Services',
          href: `/${locale}/admin/services`,
          icon: CheckSquare,
        },
        {
          label: 'Entrepôts',
          href: `/${locale}/admin/warehouses`,
          icon: Warehouse,
        },
        {
          label: 'Stockage',
          href: `/${locale}/admin/storage`,
          icon: ShoppingBag,
        },
      ],
    },
    {
      label: 'Paramètres',
      href: `/${locale}/admin/settings`,
      icon: Settings,
      tooltip: 'Configuration du système et préférences',
    },
    {
      label: 'Sécurité',
      href: `/${locale}/admin/security`,
      icon: Shield,
      tooltip: 'Gestion des accès et journaux de sécurité',
    },
  ];

  return (
    <TooltipProvider delayDuration={300}>
      <nav className="h-full flex flex-col bg-background border-r">
        <div className="p-4 border-b flex justify-between items-center">
          <Link href={`/${locale}/admin`} className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground font-bold">E</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm leading-none">EcoDeli</span>
              <span className="text-xs text-muted-foreground">Administration</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Notifications"
                  className="relative"
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                    4
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>4 notifications non lues</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="py-2 px-3">
          <div className="text-xs font-medium text-muted-foreground py-1.5 px-2.5">
            MENU PRINCIPAL
          </div>
        </div>

        <div className="flex-1 overflow-auto px-3">
          <div className="space-y-1">
            {navigationItems.map((item, index) => {
              // Si c'est un élément avec des sous-sections
              if ('section' in item && item.children) {
                return (
                  <Collapsible
                    key={index}
                    open={openSections[item.section]}
                    onOpenChange={() => toggleSection(item.section)}
                    className="w-full mb-1"
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            className={cn(
                              'w-full justify-between px-3 py-2 text-start flex items-center',
                              openSections[item.section] && 'bg-muted font-medium'
                            )}
                          >
                            <div className="flex items-center gap-3">
                              {item.icon && <item.icon className="h-4 w-4" />}
                              <span>{item.label}</span>
                              {item.badge && (
                                <Badge
                                  variant="default"
                                  className="ml-auto h-5 min-w-[20px] px-1 flex items-center justify-center bg-primary/80 hover:bg-primary/80"
                                >
                                  {item.badge}
                                </Badge>
                              )}
                            </div>
                            <ChevronRight
                              className={cn(
                                'h-4 w-4 transition-transform',
                                openSections[item.section] && 'rotate-90'
                              )}
                            />
                          </Button>
                        </CollapsibleTrigger>
                      </TooltipTrigger>
                      {item.tooltip && (
                        <TooltipContent side="right">
                          <p>{item.tooltip}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                    <CollapsibleContent className="pl-9 pr-2 py-1 space-y-1">
                      {item.children.map((child, childIndex) => (
                        <Tooltip key={childIndex}>
                          <TooltipTrigger asChild>
                            <Link href={child.href} passHref>
                              <Button
                                variant="ghost"
                                className={cn(
                                  'w-full justify-between px-3 py-1.5 h-auto text-sm font-normal',
                                  pathname === child.href && 'bg-muted font-medium'
                                )}
                              >
                                <div className="flex items-center">
                                  {child.icon && (
                                    <child.icon className="h-3.5 w-3.5 mr-3 text-muted-foreground" />
                                  )}
                                  <span>{child.label}</span>
                                </div>
                                {child.badge && (
                                  <Badge
                                    variant="default"
                                    className="ml-auto h-4 min-w-[16px] px-1 text-[10px] flex items-center justify-center bg-primary/80 hover:bg-primary/80"
                                  >
                                    {child.badge}
                                  </Badge>
                                )}
                              </Button>
                            </Link>
                          </TooltipTrigger>
                          {child.tooltip && (
                            <TooltipContent side="right">
                              <p>{child.tooltip}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                );
              }

              // Éléments simples (NavigationItem)
              if (isNavigationItem(item)) {
                return (
                  <Tooltip key={index}>
                    <TooltipTrigger asChild>
                      <Link href={item.href} passHref>
                        <Button
                          variant="ghost"
                          className={cn(
                            'w-full justify-between px-3 py-2 mb-1',
                            pathname === item.href && 'bg-muted font-medium'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {item.icon && <item.icon className="h-4 w-4" />}
                            <span>{item.label}</span>
                          </div>
                          {item.badge && (
                            <Badge
                              variant="default"
                              className="ml-auto h-5 min-w-[20px] px-1 flex items-center justify-center bg-primary/80 hover:bg-primary/80"
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    {item.tooltip && (
                      <TooltipContent side="right">
                        <p>{item.tooltip}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              }

              return null;
            })}
          </div>
        </div>
      </nav>
    </TooltipProvider>
  );
}
