/**
 * Types pour les composants de layout EcoDeli
 */

import { type ReactNode } from "react";
import { type LucideIcon } from "lucide-react";

// Types d'utilisateur EcoDeli
export type UserRole =
  | "CLIENT"
  | "DELIVERER"
  | "MERCHANT"
  | "PROVIDER"
  | "ADMIN";
export type SubscriptionPlan = "FREE" | "STARTER" | "PREMIUM";
export type ValidationStatus = "PENDING" | "APPROVED" | "REJECTED";

// Interface utilisateur EcoDeli
export interface EcoDeliUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role: UserRole;
  profile?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    verified: boolean;
  };
  subscription?: {
    plan: SubscriptionPlan;
    status: string;
  };
  stats?: {
    totalDeliveries?: number;
    totalEarnings?: number;
    rating?: number;
    completionRate?: number;
  };
  emailVerified: boolean;
  isActive: boolean;
  validationStatus?: ValidationStatus;
  subscriptionPlan?: SubscriptionPlan;
  rating?: number;
}

// Actions rapides
export interface QuickAction {
  key: string;
  label: string;
  icon: string | LucideIcon;
  href?: string;
  onClick?: () => void;
  badge?: string | number;
  description?: string;
}

// Notifications
export interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

// Breadcrumbs
export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
  maxItems?: number;
}

// Commutateur de langue
export interface Language {
  code: string;
  name: string;
  flag: string;
}

export interface LanguageSwitcherProps {
  variant?: "default" | "minimal" | "icon-only";
  className?: string;
}

// User menu
export interface UserMenuProps {
  user: EcoDeliUser;
  quickActions?: QuickAction[];
  onLogout?: () => void;
  className?: string;
}

// Recherche
export interface SearchSuggestion {
  id: string;
  text: string;
  type: "recent" | "trending" | "location" | "service";
  category?: string;
}

export interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  suggestions?: SearchSuggestion[];
  className?: string;
}

// Menu mobile
export interface MenuItem {
  key: string;
  label: string;
  href?: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  badge?: string | number;
  children?: MenuItem[];
  onClick?: () => void;
}

export interface MobileMenuProps {
  items: MenuItem[];
  user?: EcoDeliUser;
  onClose?: () => void;
  className?: string;
}

// Notifications
export interface NotificationBellProps {
  notifications: Notification[];
  onNotificationClick: (notification: Notification) => void;
  onMarkAllRead: () => void;
  className?: string;
}

// Headers
export interface HeaderProps {
  user?: EcoDeliUser;
  showSearch?: boolean;
  showNotifications?: boolean;
  customActions?: React.ReactNode;
  className?: string;
}

// Sidebar
export interface SidebarProps {
  items: MenuItem[];
  user?: EcoDeliUser;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

// Layout Provider
export interface LayoutContextValue {
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  notifications: Notification[];
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (
    notification: Omit<Notification, "id" | "timestamp">,
  ) => void;
  breadcrumbs: BreadcrumbItem[];
  setBreadcrumbs: (items: BreadcrumbItem[]) => void;
}

// Statistiques dashboard
export interface DashboardStats {
  totalRevenue?: number;
  totalOrders?: number;
  activeUsers?: number;
  completionRate?: number;
  averageRating?: number;
  pendingDeliveries?: number;
  monthlyGrowth?: number;
}

export interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: "increase" | "decrease";
    period: string;
  };
  icon?: LucideIcon;
  className?: string;
}

// Graphiques
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface ChartProps {
  data: ChartDataPoint[];
  title?: string;
  type?: "bar" | "line" | "pie" | "doughnut";
  className?: string;
}

// Tables
export interface TableColumn<T = any> {
  key: string;
  label: string;
  render?: (value: any, item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

export interface TableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  loading?: boolean;
  onSort?: (column: string, direction: "asc" | "desc") => void;
  className?: string;
}

// Modales
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

// Formulaires
export interface FormFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  type?: "text" | "email" | "password" | "number" | "tel" | "url";
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
}

// Filtres
export interface FilterOption {
  label: string;
  value: string | number;
  count?: number;
}

export interface FilterProps {
  title: string;
  options: FilterOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  multiple?: boolean;
  searchable?: boolean;
  className?: string;
}

// Types utilitaires
export type ThemeMode = LayoutContextValue["theme"];
export type NotificationType = Notification["type"];
export type RoleBasedComponent<T = {}> = React.ComponentType<
  T & { role: UserRole }
>;
export type ConditionalComponent<T = {}> = React.ComponentType<
  T & { condition: boolean }
>;

// Footer public
export interface PublicFooterProps {
  variant?: "minimal" | "full";
  showSocial?: boolean;
  showWarehouseInfo?: boolean;
  className?: string;
}
