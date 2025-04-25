"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Home,
  User,
  ShoppingBag,
  Truck,
  Store,
  Briefcase,
  Settings,
  LogOut,
  FileText,
  Bell,
  CreditCard,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserRole } from "@prisma/client";

interface SidebarNavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

function SidebarNavItem({ href, icon, label, active }: SidebarNavItemProps) {
  return (
    <Link href={href} className="w-full">
      <Button
        variant={active ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start",
          active ? "bg-secondary" : "hover:bg-secondary/50",
        )}
      >
        {icon}
        <span className="ml-2">{label}</span>
      </Button>
    </Link>
  );
}

interface DashboardNavigationProps {
  role: UserRole;
}

export function DashboardNavigation({ role }: DashboardNavigationProps) {
  const t = useTranslations("navigation");
  const pathname = usePathname();

  // Déterminer les liens de navigation en fonction du rôle
  const getNavLinks = () => {
    const baseLinks = [
      {
        href: `/${role.toLowerCase()}`,
        icon: <Home className="h-4 w-4" />,
        label: t("dashboard"),
      },
      {
        href: `/profile`,
        icon: <User className="h-4 w-4" />,
        label: t("profile"),
      },
    ];

    const roleSpecificLinks = {
      CLIENT: [
        {
          href: `/client/orders`,
          icon: <ShoppingBag className="h-4 w-4" />,
          label: t("client.orders"),
        },
        {
          href: `/client/addresses`,
          icon: <Home className="h-4 w-4" />,
          label: t("client.addresses"),
        },
        {
          href: `/client/payment-methods`,
          icon: <CreditCard className="h-4 w-4" />,
          label: t("client.paymentMethods"),
        },
      ],
      DELIVERER: [
        {
          href: `/deliverer/deliveries`,
          icon: <Truck className="h-4 w-4" />,
          label: t("deliverer.deliveries"),
        },
        {
          href: `/deliverer/documents`,
          icon: <FileText className="h-4 w-4" />,
          label: t("deliverer.documents"),
        },
      ],
      MERCHANT: [
        {
          href: `/merchant/stores`,
          icon: <Store className="h-4 w-4" />,
          label: t("merchant.stores"),
        },
        {
          href: `/merchant/products`,
          icon: <ShoppingBag className="h-4 w-4" />,
          label: t("merchant.products"),
        },
        {
          href: `/merchant/orders`,
          icon: <ShoppingBag className="h-4 w-4" />,
          label: t("merchant.orders"),
        },
        {
          href: `/merchant/documents`,
          icon: <FileText className="h-4 w-4" />,
          label: t("merchant.documents"),
        },
      ],
      PROVIDER: [
        {
          href: `/provider/services`,
          icon: <Briefcase className="h-4 w-4" />,
          label: t("provider.services"),
        },
        {
          href: `/provider/bookings`,
          icon: <ShoppingBag className="h-4 w-4" />,
          label: t("provider.bookings"),
        },
        {
          href: `/provider/documents`,
          icon: <FileText className="h-4 w-4" />,
          label: t("provider.documents"),
        },
      ],
      ADMIN: [
        {
          href: `/admin/users`,
          icon: <User className="h-4 w-4" />,
          label: t("admin.users"),
        },
        {
          href: `/admin/stores`,
          icon: <Store className="h-4 w-4" />,
          label: t("admin.stores"),
        },
        {
          href: `/admin/orders`,
          icon: <ShoppingBag className="h-4 w-4" />,
          label: t("admin.orders"),
        },
        {
          href: `/admin/services`,
          icon: <Briefcase className="h-4 w-4" />,
          label: t("admin.services"),
        },
        {
          href: `/admin/documents`,
          icon: <FileText className="h-4 w-4" />,
          label: t("admin.documents"),
        },
        {
          href: `/admin/notifications`,
          icon: <Bell className="h-4 w-4" />,
          label: t("admin.notifications"),
        },
      ],
    };

    const commonLinks = [
      {
        href: `/settings`,
        icon: <Settings className="h-4 w-4" />,
        label: t("settings"),
      },
      {
        href: `/help`,
        icon: <HelpCircle className="h-4 w-4" />,
        label: t("help"),
      },
    ];

    return [...baseLinks, ...(roleSpecificLinks[role] || []), ...commonLinks];
  };

  const navLinks = getNavLinks();

  return (
    <div className="flex flex-col gap-1">
      {navLinks.map((link) => (
        <SidebarNavItem
          key={link.href}
          href={link.href}
          icon={link.icon}
          label={link.label}
          active={pathname === link.href}
        />
      ))}
    </div>
  );
}

export function DashboardUserInfo() {
  const { data: session } = useSession();
  const t = useTranslations("common");

  if (!session?.user) {
    return null;
  }

  const { user } = session;
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <div className="flex items-center gap-2 p-4">
      <Avatar>
        <AvatarImage src={user.image || ""} alt={user.name || ""} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <p className="text-sm font-medium">{user.name}</p>
        <p className="text-xs text-muted-foreground">{user.email}</p>
      </div>
    </div>
  );
}

export function DashboardSidebarFooter() {
  const t = useTranslations("common");

  return (
    <div className="mt-auto p-4">
      <form action="/api/auth/signout" method="POST">
        <Button
          variant="outline"
          className="w-full justify-start"
          type="submit"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {t("signOut")}
        </Button>
      </form>
    </div>
  );
}
