import { router } from '@/server/api/trpc';
import { adminUserRouter } from './admin-user.router';
import { adminDashboardRouter } from './admin-dashboard.router';
import { warehouseRouter } from './warehouse.router';
import { auditRouter } from './audit.router';

/**
 * Routeur principal pour l'administration
 * Regroupe tous les sous-routeurs administratifs
 */
export const adminRouter = router({
  users: adminUserRouter,
  dashboard: adminDashboardRouter,
  warehouses: warehouseRouter,
  audit: auditRouter,
});

export type AdminRouter = typeof adminRouter;
