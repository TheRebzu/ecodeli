export const dashboardConfig = {
  mainNav: [
    // Navigation principale
  ],
  sidebarNav: {
    client: [
      // Navigation sidebar client
    ],
    deliverer: [
      // Navigation sidebar livreur
    ],
    merchant: [
      // Navigation sidebar commerçant
    ],
    provider: [
      // Navigation sidebar prestataire
    ],
    admin: [
      // Navigation sidebar admin
    ]}};

// Configuration du dashboard
export const DelivererWalletDashboard = {
  title: "Portefeuille Livreur",
  widgets: [
    "balance",
    "pending-payments",
    "transaction-history",
    "withdrawal-options"],
  layout: "grid-2x2"};

export const ClientDashboard = {
  title: "Tableau de bord Client",
  widgets: [
    "recent-orders",
    "active-deliveries",
    "payment-methods",
    "favorites"],
  layout: "grid-3x1"};

export const MerchantDashboard = {
  title: "Tableau de bord Marchand",
  widgets: ["sales-overview", "pending-orders", "delivery-status", "analytics"],
  layout: "grid-2x2"};

export const ProviderDashboard = {
  title: "Tableau de bord Prestataire",
  widgets: [
    "upcoming-appointments",
    "earnings-summary",
    "client-reviews",
    "service-requests"],
  layout: "grid-2x2"};

export const AdminDashboard = {
  title: "Tableau de bord Admin",
  widgets: [
    "platform-overview",
    "user-statistics",
    "revenue-analytics",
    "system-health"],
  layout: "grid-3x2"};
