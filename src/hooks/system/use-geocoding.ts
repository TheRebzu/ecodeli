import { api } from "@/trpc/react";

export function useGeocoding() {
  const utils = api.useUtils();

  const searchAddress = async (query: string, limit = 5) => {
    try {
      return await utils.geocoding.searchAddress.fetch({ query,
        limit });
    } catch (error) {
      console.error("Error searching address:", error);
      throw error;
    }
  };

  const reverseGeocode = async (lat: number, lon: number, zoom = 18) => {
    try {
      return await utils.geocoding.reverseGeocode.fetch({ lat,
        lon,
        zoom });
    } catch (error) {
      console.error("Error reverse geocoding:", error);
      throw error;
    }
  };

  return {
    searchAddress,
    reverseGeocode};
}
