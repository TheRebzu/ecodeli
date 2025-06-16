import axios from "axios";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export const MapsService = {
  async calculateDistance(origin: string, destination: string) {
    try {
      const response = await axios.get(
        "https://maps.googleapis.com/maps/api/distancematrix/json",
        {
          params: {
            origins: origin,
            destinations: destination,
            key: GOOGLE_MAPS_API_KEY}},
      );

      if (response.data.status === "OK") {
        const distance = response.data.rows[0].elements[0].distance;
        const duration = response.data.rows[0].elements[0].duration;

        return {
          distanceText: distance.text,
          distanceValue: distance.value, // en mètres
          durationText: duration.text,
          durationValue: duration.value, // en secondes
        };
      }

      throw new Error("Calcul de distance impossible");
    } catch (error) {
      console.error("Erreur API Google Maps:", error);
      throw new Error("Calcul de distance impossible");
    }
  },

  async geocodeAddress(address: string) {
    try {
      const response = await axios.get(
        "https://maps.googleapis.com/maps/api/geocode/json",
        {
          params: {
            address,
            key: GOOGLE_MAPS_API_KEY}},
      );

      if (response.data.status === "OK") {
        const { lat: lat, lng: lng } =
          response.data.results[0].geometry.location;
        return { lat, lng };
      }

      throw new Error("Géocodage impossible");
    } catch (error) {
      console.error("Erreur API Google Maps:", error);
      throw new Error("Géocodage impossible");
    }
  }};
