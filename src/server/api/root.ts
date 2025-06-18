import superjson from "superjson";
import { router, createTRPCContext } from "./trpc";

// Auth routers
import { authRouter } from "./routers/auth/auth.router";
import { verificationRouter } from "./routers/auth/verification.router";

// Common routers
import { userRouter } from "./routers/common/user.router";
import { paymentRouter } from "./routers/common/payment.router";
import { documentRouter } from "./routers/common/document.router";
import { profileRouter } from "./routers/common/profile.router";
import { notificationRouter } from "./routers/common/notification.router";
import { userPreferencesRouter } from "./routers/common/user-preferences.router";
import { walletRouter } from "./routers/common/wallet.router";
import { uploadRouter } from "./routers/common/upload.router";
import { geocodingRouter } from "./routers/common/geocoding.router";
import { exportRouter } from "./routers/common/export.router";
import { pdfRouter } from "./routers/common/pdf.router";
import { i18nRouter } from "./routers/common/i18n.router";
import { stripeStatusRouter } from "./routers/common/stripe-status.router";

// Shared routers
import { announcementRouter } from "./routers/shared/announcement.router";
import { warehouseRouter } from "./routers/shared/warehouse.router";
import { invoiceRouter } from "./routers/shared/invoice.router";
import { billingRouter } from "./routers/shared/billing.router";
import { withdrawalRouter } from "./routers/shared/withdrawal.router";
import { financialTaskRouter } from "./routers/shared/financial-task.router";

// Admin routers
import { adminRouter } from "./routers/admin/admin.router";
import { adminUserRouter } from "./routers/admin/admin-users.router";
import { adminServicesRouter } from "./routers/admin/admin-services.router";
import { adminContractsRouter } from "./routers/admin/admin-contracts.router";

// Client routers
import { clientRouter } from "./routers/client/client.router";
import { storageRouter } from "./routers/client/client-storage.router";

// Deliverer routers
import { delivererRouter } from "./routers/deliverer/deliverer.router";
import { deliveryRouter } from "./routers/deliverer/deliverer-deliveries.router";
import { deliveryTrackingRouter } from "./routers/deliverer/deliverer-tracking.router";
import { delivererDocumentsRouter } from "./routers/deliverer/deliverer-documents.router";

// Provider routers
import { providerRouter } from "./routers/provider/provider.router";
import { serviceRouter } from "./routers/provider/provider-services.router";
import { providerSkillsRouter } from "./routers/provider/provider-skills.router";
import { providerCalendarRouter } from "./routers/provider/provider-calendar.router";
import { providerEvaluationsRouter } from "./routers/provider/provider-evaluations.router";

// Merchant routers
import { merchantRouter } from "./routers/merchant/merchant.router";
import { contractRouter } from "./routers/merchant/merchant-contracts.router";
import { merchantCatalogRouter } from "./routers/merchant/merchant-catalog.router";
import { merchantAnnouncementsRouter } from "./routers/merchant/merchant-announcements.router";
import { merchantStatsRouter } from "./routers/merchant/merchant-stats.router";
import { merchantPaymentsRouter } from "./routers/merchant/merchant-payments.router";
import { cartDropRouter } from "./routers/merchant/cart-drop.router";

// Subscription router (assuming it exists in shared or we create it)
import { subscriptionRouter } from "./routers/client/client-subscription.router";

// Routers spécialisés pour les spécifications EcoDeli
import { delivererRoutesRouter } from "./routers/deliverer/deliverer-routes.router";
import { delivererValidationRouter } from "./routers/deliverer/deliverer-validation.router";
import { delivererWalletRouter } from "./routers/deliverer/deliverer-wallet.router";
import { delivererPerformanceRouter } from "./routers/deliverer/deliverer-performance.router";
import { nfcManagementRouter } from "./routers/deliverer/nfc-management.router";

// New client routers
import { clientAnnouncementsRouter } from "./routers/client/client-announcements.router";
import { clientTutorialRouter } from "./routers/client/client-tutorial.router";
import { clientPersonalServicesRouter } from "./routers/client/client-personal-services.router";
import { clientDataRouter } from "./routers/client/client-data.router";
import { clientContractsRouter } from "./routers/client/client-contracts.router";
import { clientAppointmentsRouter } from "./routers/client/client-appointments.router";
import { clientServicesRouter } from "./routers/client/client-services.router";

// Financial router (using admin financial)
import { financialRouter } from "./routers/admin/admin-financial.router";

// Matching routers
import { matchingRouter } from "./routers/matching/matching.router";
import { partialDeliveryRouter } from "./routers/matching/partial-delivery.router";

// Re-export createTRPCContext from trpc.ts
export { createTRPCContext } from "./trpc";

/**
 * Ce fichier regroupe tous les router tRPC de l'application.
 * C'est le point d'entrée principal de l'API tRPC.
 */

/**
 * Router API principal qui regroupe tous les autres routers.
 */
export const appRouter = router({ // Auth
  auth: authRouter,
  verification: verificationRouter,

  // Common
  user: userRouter,
  payment: paymentRouter,
  document: documentRouter,
  profile: profileRouter,
  notification: notificationRouter,
  userPreferences: userPreferencesRouter,
  wallet: walletRouter,
  upload: uploadRouter,
  geocoding: geocodingRouter,
  export: exportRouter,
  pdf: pdfRouter,
  i18n: i18nRouter,
  stripeStatus: stripeStatusRouter,

  // Shared
  announcement: announcementRouter,
  warehouse: warehouseRouter,
  invoice: invoiceRouter,
  billing: billingRouter,
  withdrawal: withdrawalRouter,
  financialTask: financialTaskRouter,

  // Admin
  admin: adminRouter,
  adminUser: adminUserRouter, // Direct access to admin user router
  adminServices: adminServicesRouter, // Direct access to admin services router
  adminContracts: adminContractsRouter, // Direct access to admin contracts router
  adminWarehouse: warehouseRouter, // alias pour admin warehouse

  // Client
  client: clientRouter,
  storage: storageRouter,
  subscription: subscriptionRouter,
  clientAnnouncements: clientAnnouncementsRouter,
  clientTutorial: clientTutorialRouter,
  clientPersonalServices: clientPersonalServicesRouter,
  clientData: clientDataRouter,
  clientContracts: clientContractsRouter,
  clientAppointments: clientAppointmentsRouter,
  clientServices: clientServicesRouter,

  // Deliverer
  deliverer: delivererRouter,
  delivery: deliveryRouter,
  deliveryTracking: deliveryTrackingRouter,
  delivererDocuments: delivererDocumentsRouter,
  delivererRoutes: delivererRoutesRouter,
  delivererValidation: delivererValidationRouter,
  delivererWallet: delivererWalletRouter,
  delivererPerformance: delivererPerformanceRouter,
  nfcManagement: nfcManagementRouter,

  // Provider
  provider: providerRouter,
  service: serviceRouter,
  providerSkills: providerSkillsRouter,
  providerCalendar: providerCalendarRouter,
  providerEvaluations: providerEvaluationsRouter,

  // Merchant
  merchant: merchantRouter,
  contract: contractRouter,
  merchantCatalog: merchantCatalogRouter,
  merchantAnnouncements: merchantAnnouncementsRouter,
  merchantStats: merchantStatsRouter,
  merchantPayments: merchantPaymentsRouter,
  cartDrop: cartDropRouter,

  // Financial
  financial: financialRouter,

  // Matching
  matching: matchingRouter,
  partialDelivery: partialDeliveryRouter,

  // Legacy aliases (renamed from fileRouter to uploadRouter for clarity)
  file: uploadRouter });

// Type d'export pour le typage côté client
export type AppRouter = typeof appRouter;
