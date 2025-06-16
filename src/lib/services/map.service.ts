import { calculateDistance, calculateETA } from "@/lib/utils/index";

export const mapService = {
  // Créer une carte centrée sur une position
  initializeMap(elementId, center, zoom = 13) {
    if (typeof window === "undefined") return null;

    const L = window.L;
    const map = L.map(elementId).setView(center, zoom);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19}).addTo(map);

    return map;
  },

  // Créer un marqueur pour le livreur avec une icône personnalisée
  createDelivererMarker(map, position, options = {}) {
    const L = window.L;

    const delivererIcon = L.icon({ iconUrl: "/images/deliverer-marker.png",
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32] });

    const marker = L.marker(position, {
      icon: delivererIcon,
      ...options}).addTo(map);

    return marker;
  },

  // Tracer l'itinéraire entre deux points
  async drawRoute(map, startPosition, endPosition) {
    // Utiliser un service comme OSRM ou Mapbox Directions API
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/` +
        `${startPosition[1]},${startPosition[0]};${endPosition[1]},${endPosition[0]}` +
        `?overview=full&geometries=geojson`,
    );

    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const routeLine = L.geoJSON(route.geometry).addTo(map);

      return {
        route: routeLine,
        distance: route.distance,
        duration: route.duration};
    }

    return null;
  },

  // Calculer une estimation du temps d'arrivée
  calculateETA(currentPosition, destination, averageSpeed = 30) {
    const distance = calculateDistance(currentPosition, destination);
    return calculateETA(distance, averageSpeed);
  }};
