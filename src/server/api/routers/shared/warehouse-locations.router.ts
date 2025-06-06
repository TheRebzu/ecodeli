import { z } from "zod";
import { router as router, protectedProcedure  } from '@/server/api/trpc';

// Gestion des 6 entrepôts EcoDeli
export const warehouseLocationsRouter = router({
  getLocations: protectedProcedure.query(async () => {
    return [
      { id: 1, city: "Paris", address: "110 rue de Flandre, 75019", isHeadquarters: true },
      { id: 2, city: "Marseille", type: "backup_mail" },
      { id: 3, city: "Lyon", type: "backup_servers" },
      { id: 4, city: "Lille", type: "rodc_rgpd" },
      { id: 5, city: "Montpellier", status: "planned" },
      { id: 6, city: "Rennes", status: "planned" }
    ];
  }),
});
