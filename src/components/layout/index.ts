/**
 * Index des exports pour le système de layout unifié EcoDeli
 */

// Layout components
export { DashboardLayout } from "./dashboard-layout";
export { PublicLayout } from "./public-layout";

// Headers
export { PublicHeader } from "./headers/public-header";
export { BaseHeader } from "./headers/base-header";
export { ClientHeader } from "./headers/client-header";
export { AdminHeader } from "./headers/admin-header";
export { DelivererHeader } from "./headers/deliverer-header";
export { MerchantHeader } from "./headers/merchant-header";
export { ProviderHeader } from "./headers/provider-header";

// Sidebars
export { BaseSidebar } from "./sidebars/base-sidebar";
export { ClientSidebar } from "./sidebars/client-sidebar";
export { AdminSidebar } from "./sidebars/admin-sidebar";
export { DelivererSidebar } from "./sidebars/deliverer-sidebar";
export { MerchantSidebar } from "./sidebars/merchant-sidebar";
export { ProviderSidebar } from "./sidebars/provider-sidebar";

// Other existing components
export { PageHeader } from "./page-header";

// Types (if they exist)
export type * from "./types";
