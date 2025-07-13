import { ReactNode } from "react";

// Base types pour tous les headers
export interface BaseHeaderProps {
  user: {
    id: string;
    name?: string;
    email: string;
    avatar?: string;
    isVerified?: boolean;
  };
  onLogout: () => void;
  className?: string;
}

// Admin Header
export interface AdminHeaderProps extends BaseHeaderProps {
  user: BaseHeaderProps["user"] & {
    role: "ADMIN";
  };
  pendingValidations?: number;
  systemAlerts?: number;
}

// Client Header
export interface ClientHeaderProps extends BaseHeaderProps {
  user: BaseHeaderProps["user"] & {
    role: "CLIENT";
    subscription?: "FREE" | "STARTER" | "PREMIUM";
  };
  activeDeliveries?: number;
  unreadNotifications?: number;
}

// Deliverer Header
export interface DelivererHeaderProps extends BaseHeaderProps {
  user: BaseHeaderProps["user"] & {
    role: "DELIVERER";
    rating?: number;
  };
  activeDeliveries?: number;
  pendingRequests?: number;
  earnings?: {
    today: number;
    week: number;
    month: number;
  };
}

// Merchant Header
export interface MerchantHeaderProps extends BaseHeaderProps {
  user: BaseHeaderProps["user"] & {
    role: "MERCHANT";
    storeName?: string;
  };
  pendingOrders?: number;
  newMessages?: number;
}

// Provider Header
export interface ProviderHeaderProps extends BaseHeaderProps {
  user: BaseHeaderProps["user"] & {
    role: "PROVIDER";
    specialties?: string[];
    rating?: number;
  };
  upcomingBookings?: number;
  pendingRequests?: number;
}

// Navigation Item
export interface NavigationItem {
  key: string;
  label: string;
  href: string;
  icon?: string;
  children?: NavigationItem[];
}

// Public Header
export interface PublicHeaderProps {
  className?: string;
  showAuth?: boolean;
  showLanguageSwitcher?: boolean;
  showThemeToggle?: boolean;
}

// Page Header
export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumb?: Breadcrumb[];
  actions?: ReactNode;
  className?: string;
}

export interface Breadcrumb {
  label: string;
  href?: string;
  icon?: ReactNode;
}

// Footer
export interface FooterProps {
  variant?: "public" | "dashboard";
  className?: string;
}

// Layout wrappers
export interface DashboardLayoutProps {
  children: ReactNode;
  user: BaseHeaderProps["user"] & {
    role: "ADMIN" | "CLIENT" | "DELIVERER" | "MERCHANT" | "PROVIDER";
  };
  header?: ReactNode;
  sidebar?: ReactNode;
  className?: string;
}

export interface PublicLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  headerProps?: PublicHeaderProps;
  footerProps?: FooterProps;
  className?: string;
}

// Navigation types
export interface NavItem {
  label: string;
  href: string;
  icon?: ReactNode;
  badge?: string | number;
  isActive?: boolean;
  children?: NavItem[];
}

export interface UserMenuProps {
  user: BaseHeaderProps["user"];
  onLogout: () => void;
  menuItems?: UserMenuItem[];
}

export interface UserMenuItem {
  label: string;
  href?: string;
  icon?: ReactNode;
  onClick?: () => void;
  variant?: "default" | "destructive";
}

// Notification types
export interface NotificationProps {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: Date;
  isRead: boolean;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

// Theme types
export type Theme = "light" | "dark" | "system";

// Layout variants
export type LayoutVariant = "default" | "compact" | "minimal";

// Responsive breakpoints
export type Breakpoint = "mobile" | "tablet" | "desktop" | "wide";
