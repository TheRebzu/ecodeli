import { router } from '../../trpc';
import { adminAnnouncementsRouter } from './admin-announcements.router';
import { adminDeliverersRouter } from './admin-deliverers.router';
import { adminDashboardRouter } from './admin-dashboard.router';
import { adminUserRouter } from './admin-users.router';

/**
 * Router admin principal
 * Regroupe tous les sous-routers administratifs
 */
export const adminRouter = router({
  announcements: adminAnnouncementsRouter,
  deliverers: adminDeliverersRouter,
  dashboard: adminDashboardRouter,
  users: adminUserRouter,
});
