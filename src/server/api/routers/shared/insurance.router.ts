import { z } from 'zod';
import { router as router, protectedProcedure } from '@/server/api/trpc';

// Gestion des assurances colis
export const insuranceRouter = router({
  getPlans: protectedProcedure.query(async () => {
    return {
      free: { coverage: 0 },
      starter: { coverage: 115, price: 9.9 },
      premium: { coverage: 3000, price: 19.99 },
    };
  }),
});
