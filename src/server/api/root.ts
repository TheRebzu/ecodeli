import { createCallerFactory, router } from '@/server/api/trpc';

// ====================
// ROUTEURS D'AUTHENTIFICATION
// ====================
import { authRouter } from "./routers/auth/auth.router";
import { verificationRouter } from "./routers/auth/verification.router";

// ====================
// ROUTEURS COMMUNS
// ====================
import { userRouter } from "./routers/common/user.router";
import { profileRouter } from "./routers/common/profile.router";
import { messagingRouter } from "./routers/common/messaging.router";
import { notificationRouter } from "./routers/common/notification.router";
import { documentRouter } from "./routers/common/document.router";
import { uploadRouter } from "./routers/common/upload.router";
import { paymentRouter } from "./routers/common/payment.router";
import { walletRouter } from "./routers/common/wallet.router";
import { geocodingRouter } from "./routers/common/geocoding.router";
import { userPreferencesRouter } from "./routers/common/user-preferences.router";
import { i18nRouter } from "./routers/common/i18n.router";
import { cloudServicesRouter } from "./routers/common/cloud-services.router";
import { pdfGeneratorRouter } from "./routers/common/pdf-generator.router";
import { pushNotificationsRouter } from "./routers/common/push-notifications.router";

// ====================
// ESPACE LIVREURS
// ====================
import { delivererRouter } from "./routers/deliverer/deliverer.router";
import { delivererAnnouncementsRouter } from "./routers/deliverer/deliverer-announcements.router";
// import { delivererDocumentsRouter } from "./routers/deliverer/deliverer-documents.router";
import { deliveryRouter as delivererDeliveriesRouter } from './routers/deliverer/deliverer-deliveries.router';
import { delivererPaymentsRouter } from "./routers/deliverer/deliverer-payments.router";
// import { delivererPlanningRouter } from "./routers/deliverer/deliverer-planning.router";
import { delivererRoutesRouter } from "./routers/deliverer/deliverer-routes.router";
import { deliveryTrackingRouter as delivererTrackingRouter } from './routers/deliverer/deliverer-tracking.router';

// ====================
// ESPACE CLIENTS
// ====================
import { clientRouter } from "./routers/client/client.router";
import { clientDataRouter } from "./routers/client/client-data.router";
import { clientAnnouncementsRouter } from "./routers/client/client-announcements.router";
import { clientServicesRouter } from "./routers/client/client-services.router";
import { clientAppointmentsRouter } from "./routers/client/client-appointments.router";
import { clientPaymentsRouter } from "./routers/client/client-payments.router";
import { storageRouter as clientStorageRouter } from "./routers/client/client-storage.router";
import { clientBoxesRouter } from "./routers/client/client-boxes.router";
import { subscriptionRouter as clientSubscriptionRouter } from "./routers/client/client-subscription.router";
// import { clientTutorialRouter } from "./routers/client/client-tutorial.router";

// ====================
// ESPACE COMMERÇANTS
// ====================
import { merchantRouter } from "./routers/merchant/merchant.router";
import { contractRouter as merchantContractsRouter } from './routers/merchant/merchant-contracts.router';
import { merchantAnnouncementsRouter } from "./routers/merchant/merchant-announcements.router";
import { merchantInvoicesRouter } from "./routers/merchant/merchant-invoices.router";
import { merchantPaymentsRouter } from "./routers/merchant/merchant-payments.router";
import { merchantServicesRouter } from "./routers/merchant/merchant-services.router";

// ====================
// ESPACE PRESTATAIRES
// ====================
import { providerRouter } from "./routers/provider/provider.router";
import { serviceRouter as providerServicesRouter } from './routers/provider/provider-services.router';
import { providerEvaluationsRouter } from "./routers/provider/provider-evaluations.router";
// import { providerValidationRouter } from "./routers/provider/provider-validation.router";
// import { providerCalendarRouter } from "./routers/provider/provider-calendar.router";
import { providerInterventionsRouter } from "./routers/provider/provider-interventions.router";
import { providerInvoicesRouter } from "./routers/provider/provider-invoices.router";
import { providerRatesRouter } from "./routers/provider/provider-rates.router";

// ====================
// ESPACE ADMINISTRATION
// ====================
// import { adminRouter } from "./routers/admin/admin.router";
import { adminDashboardRouter } from "./routers/admin/admin-dashboard.router";
import { adminUserRouter as adminUsersRouter } from "./routers/admin/admin-users.router";
import { adminMerchantsRouter } from "./routers/admin/admin-merchants.router";
// import { adminContractsRouter } from "./routers/admin/admin-contracts.router";
import { adminDeliverersRouter } from "./routers/admin/admin-deliverers.router";
import { adminProvidersRouter } from "./routers/admin/admin-providers.router";
import { adminDeliveriesRouter } from "./routers/admin/admin-deliveries.router";
import { adminServicesRouter } from "./routers/admin/admin-services.router";
import { adminPaymentsRouter } from "./routers/admin/admin-payments.router";
import { adminInvoicesRouter } from "./routers/admin/admin-invoices.router";
import { financialRouter as adminFinancialRouter } from "./routers/admin/admin-financial.router";
import { commissionRouter as adminCommissionRouter } from "./routers/admin/admin-commission.router";
import { auditRouter as adminAuditRouter } from "./routers/admin/admin-audit.router";

// ====================
// ROUTEURS MÉTIER PARTAGÉS
// ====================
import { announcementRouter } from "./routers/shared/announcement.router";
import { invoiceRouter } from "./routers/shared/invoice.router";
import { billingRouter } from "./routers/shared/billing.router";
import { warehouseRouter } from "./routers/shared/warehouse.router";
import { withdrawalRouter } from "./routers/shared/withdrawal.router";
import { financialTaskRouter } from "./routers/shared/financial-task.router";

/**
 * Router principal de l'API EcoDeli
 * Mission 1 - Gestion de la société
 */
export const appRouter = router({
  // Authentification
  auth: authRouter,
  verification: verificationRouter,
  
  // Communs
  user: userRouter,
  profile: profileRouter,
  messaging: messagingRouter,
  notification: notificationRouter,
  document: documentRouter,
  upload: uploadRouter,
  payment: paymentRouter,
  wallet: walletRouter,
  geocoding: geocodingRouter,
  userPreferences: userPreferencesRouter,
  i18n: i18nRouter,
  cloudServices: cloudServicesRouter,
  pdfGenerator: pdfGeneratorRouter,
  pushNotifications: pushNotificationsRouter,
  
  // Espace Livreurs
  deliverer: delivererRouter,
  delivererAnnouncements: delivererAnnouncementsRouter,
  // delivererDocuments: delivererDocumentsRouter,
  delivererDeliveries: delivererDeliveriesRouter,
  delivererPayments: delivererPaymentsRouter,
  // delivererPlanning: delivererPlanningRouter,
  delivererRoutes: delivererRoutesRouter,
  delivererTracking: delivererTrackingRouter,
  
  // Espace Clients
  client: clientRouter,
  clientData: clientDataRouter,
  clientAnnouncements: clientAnnouncementsRouter,
  clientServices: clientServicesRouter,
  clientAppointments: clientAppointmentsRouter,
  clientPayments: clientPaymentsRouter,
  clientStorage: clientStorageRouter,
  clientBoxes: clientBoxesRouter,
  clientSubscription: clientSubscriptionRouter,
  // clientTutorial: clientTutorialRouter,
  
  // Espace Commerçants
  merchant: merchantRouter,
  merchantContracts: merchantContractsRouter,
  merchantAnnouncements: merchantAnnouncementsRouter,
  merchantInvoices: merchantInvoicesRouter,
  merchantPayments: merchantPaymentsRouter,
  merchantServices: merchantServicesRouter,
  
  // Espace Prestataires
  provider: providerRouter,
  providerServices: providerServicesRouter,
  providerEvaluations: providerEvaluationsRouter,
  // providerValidation: providerValidationRouter,
  // providerCalendar: providerCalendarRouter,
  providerInterventions: providerInterventionsRouter,
  providerInvoices: providerInvoicesRouter,
  providerRates: providerRatesRouter,
  
  // Espace Administration
  // admin: adminRouter,
  adminDashboard: adminDashboardRouter,
  adminUsers: adminUsersRouter,
  adminMerchants: adminMerchantsRouter,
  // adminContracts: adminContractsRouter,
  adminDeliverers: adminDeliverersRouter,
  adminProviders: adminProvidersRouter,
  adminDeliveries: adminDeliveriesRouter,
  adminServices: adminServicesRouter,
  adminPayments: adminPaymentsRouter,
  adminInvoices: adminInvoicesRouter,
  adminFinancial: adminFinancialRouter,
  adminCommission: adminCommissionRouter,
  adminAudit: adminAuditRouter,
  
  // Routeurs métier partagés
  announcement: announcementRouter,
  invoice: invoiceRouter,
  billing: billingRouter,
  warehouse: warehouseRouter,
  withdrawal: withdrawalRouter,
  financialTask: financialTaskRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
