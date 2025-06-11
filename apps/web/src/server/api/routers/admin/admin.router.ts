import { router } from '../../trpc';
import { adminDeliverersRouter } from './admin-deliverers.router';
import { adminDashboardRouter } from './admin-dashboard.router';
import { adminUserRouter } from './admin-users.router';
import { adminServicesRouter } from './admin-services.router';
import { adminLogsRouter } from './admin-logs.router';
import { adminSettingsRouter } from './admin-settings.router';
import { financialRouter } from './admin-financial.router';

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
});
