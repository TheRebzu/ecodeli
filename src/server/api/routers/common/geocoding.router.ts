import { z } from "zod";
import { router, publicProcedure } from "@/server/api/trpc";

export const geocodingRouter = router({
  // Recherche d'adresse (géocodage)
  searchAddress: publicProcedure
    .input(
      z.object({
        query: z
          .string()
          .min(3, "La requête doit contenir au moins 3 caractères"),
        limit: z.number().min(1).max(10).default(5),
      }),
    )
    .query(async ({ input }) => {
      const { query, limit } = input;

      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query,
        )}&limit=${limit}&countrycodes=fr&addressdetails=1`;

        const response = await fetch(url, {
          headers: {
            "User-Agent": "EcoDeli/1.0 (contact@ecodeli.fr)",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        return data.map((item: any) => ({
          display_name: item.display_name,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          address: item.address,
          place_id: item.place_id,
          type: item.type,
          importance: item.importance,
        }));
      } catch (error) {
        console.error("Geocoding error:", error);
        throw new Error("Erreur lors de la recherche d'adresse");
      }
    }),

  // Géocodage inverse (coordonnées -> adresse)
  reverseGeocode: publicProcedure
    .input(
      z.object({
        lat: z.number().min(-90).max(90),
        lon: z.number().min(-180).max(180),
        zoom: z.number().min(1).max(18).default(18),
      }),
    )
    .query(async ({ input }) => {
      const { lat, lon, zoom } = input;

      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=${zoom}&addressdetails=1`;

        const response = await fetch(url, {
          headers: {
            "User-Agent": "EcoDeli/1.0 (contact@ecodeli.fr)",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        return {
          display_name: data.display_name,
          lat: parseFloat(data.lat),
          lon: parseFloat(data.lon),
          address: data.address,
          place_id: data.place_id,
          type: data.type,
        };
      } catch (error) {
        console.error("Reverse geocoding error:", error);
        throw new Error("Erreur lors du géocodage inverse");
      }
    }),
});
