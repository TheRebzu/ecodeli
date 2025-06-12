import { router } from '@/server/api/trpc';
import { adminDeliverersRouter } from './admin-deliverers.router';
import { adminDashboardRouter } from './admin-dashboard.router';
import { adminUserRouter } from './admin-users.router';
import { adminServicesRouter } from './admin-services.router';
import { adminLogsRouter } from './admin-logs.router';
import { adminSettingsRouter } from './admin-settings.router';
import { financialRouter } from './admin-financial.router';
import { adminVerificationRouter } from './admin-verification.router';
import { adminReportsRouter } from './admin-reports.router';
import { adminContractsRouter } from './admin-contracts.router';
import { adminMerchantsRouter } from './admin-merchants.router';
import { adminProvidersRouter } from './admin-providers.router';
import { adminDeliveriesRouter } from './admin-deliveries.router';
import { adminInvoicesRouter } from './admin-invoices.router';
import { adminPaymentsRouter } from './admin-payments.router';
import { auditRouter } from './admin-audit.router';
import { adminCommissionRouter } from './admin-commission.router';

/**
 * Router admin principal
 * Regroupe tous les sous-routers administratifs
 */
export const adminRouter = router({
  deliverers: adminDeliverersRouter,
  dashboard: adminDashboardRouter,
  users: adminUserRouter,
  services: adminServicesRouter,
  logs: adminLogsRouter,
  settings: adminSettingsRouter,
  financial: financialRouter,
  verification: adminVerificationRouter,
  reports: adminReportsRouter,
  contracts: adminContractsRouter,
  merchants: adminMerchantsRouter,
  providers: adminProvidersRouter,
  deliveries: adminDeliveriesRouter,
  invoices: adminInvoicesRouter,
  payments: adminPaymentsRouter,
  audit: auditRouter,
  commission: adminCommissionRouter,
});
