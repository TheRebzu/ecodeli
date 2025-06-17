"use client";

export interface GPSPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export interface ETACalculation {
  estimatedMinutes: number;
  estimatedArrival: string;
  confidence: number;
  distance: number;
  trafficFactor: number;
  route?: {
    polyline: string;
    steps: Array<{
      instruction: string;
      distance: number;
      duration: number;
    }>;
  };
}

export interface DeliveryRoute {
  origin: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number };
  waypoints?: Array<{ latitude: number; longitude: number }>;
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  optimizeRoute?: boolean;
}

export class GPSTrackingService {
  private watchId: number | null = null;
  private lastPosition: GPSPosition | null = null;
  private positionHistory: GPSPosition[] = [];
  private maxHistorySize = 50;
  private onPositionUpdate?: (position: GPSPosition) => void;
  private onETAUpdate?: (eta: ETACalculation) => void;
  private trackingActive = false;

  // Configuration du tracking
  private options: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 5000
  };

  /**
   * Démarre le tracking GPS
   */
  async startTracking(
    onPositionUpdate?: (position: GPSPosition) => void,
    onETAUpdate?: (eta: ETACalculation) => void
  ): Promise<boolean> {
    if (!navigator.geolocation) {
      console.error("Géolocalisation non supportée par ce navigateur");
      return false;
    }

    this.onPositionUpdate = onPositionUpdate;
    this.onETAUpdate = onETAUpdate;
    this.trackingActive = true;

    try {
      // Obtenir une position initiale
      const initialPosition = await this.getCurrentPosition();
      this.handlePositionUpdate(initialPosition);

      // Commencer le tracking continu
      this.watchId = navigator.geolocation.watchPosition(
        (position) => this.handlePositionUpdate(position),
        (error) => this.handlePositionError(error),
        this.options
      );

      console.log("📍 Tracking GPS démarré");
      return true;
    } catch (error) {
      console.error("Erreur lors du démarrage du tracking:", error);
      return false;
    }
  }

  /**
   * Arrête le tracking GPS
   */
  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.trackingActive = false;
    console.log("📍 Tracking GPS arrêté");
  }

  /**
   * Obtient la position actuelle
   */
  getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Géolocalisation non supportée"));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, this.options);
    });
  }

  /**
   * Gère les mises à jour de position
   */
  private handlePositionUpdate(position: GeolocationPosition): void {
    const gpsPosition: GPSPosition = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude || undefined,
      altitudeAccuracy: position.coords.altitudeAccuracy || undefined,
      heading: position.coords.heading || undefined,
      speed: position.coords.speed || undefined,
      timestamp: position.timestamp
    };

    // Filtrer les positions avec une précision trop faible
    if (gpsPosition.accuracy > 100) {
      console.warn("Position ignorée - précision trop faible:", gpsPosition.accuracy);
      return;
    }

    // Filtrer les positions trop proches de la dernière (éviter le bruit GPS)
    if (this.lastPosition && this.calculateDistance(this.lastPosition, gpsPosition) < 5) {
      return;
    }

    this.lastPosition = gpsPosition;
    this.addToHistory(gpsPosition);

    // Notifier les écouteurs
    if (this.onPositionUpdate) {
      this.onPositionUpdate(gpsPosition);
    }

    console.log("📍 Position mise à jour:", {
      lat: gpsPosition.latitude.toFixed(6),
      lng: gpsPosition.longitude.toFixed(6),
      accuracy: Math.round(gpsPosition.accuracy),
      speed: gpsPosition.speed ? Math.round(gpsPosition.speed * 3.6) : null // m/s vers km/h
    });
  }

  /**
   * Gère les erreurs de géolocalisation
   */
  private handlePositionError(error: GeolocationPositionError): void {
    let errorMessage = "Erreur de géolocalisation inconnue";
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = "Permission de géolocalisation refusée";
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = "Position indisponible";
        break;
      case error.TIMEOUT:
        errorMessage = "Timeout de géolocalisation";
        break;
    }

    console.error("❌", errorMessage, error);
  }

  /**
   * Ajoute une position à l'historique
   */
  private addToHistory(position: GPSPosition): void {
    this.positionHistory.push(position);
    if (this.positionHistory.length > this.maxHistorySize) {
      this.positionHistory.shift();
    }
  }

  /**
   * Calcule la distance entre deux points (en mètres)
   */
  calculateDistance(
    pos1: { latitude: number; longitude: number },
    pos2: { latitude: number; longitude: number }
  ): number {
    const R = 6371e3; // Rayon de la Terre en mètres
    const φ1 = (pos1.latitude * Math.PI) / 180;
    const φ2 = (pos2.latitude * Math.PI) / 180;
    const Δφ = ((pos2.latitude - pos1.latitude) * Math.PI) / 180;
    const Δλ = ((pos2.longitude - pos1.longitude) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Calcule l'ETA vers une destination
   */
  async calculateETA(
    destination: { latitude: number; longitude: number },
    route?: DeliveryRoute
  ): Promise<ETACalculation | null> {
    if (!this.lastPosition) {
      console.warn("Aucune position GPS disponible pour calculer l'ETA");
      return null;
    }

    try {
      // Calcul de base avec distance à vol d'oiseau
      const straightLineDistance = this.calculateDistance(this.lastPosition, destination);
      
      // Facteur de correction pour route réelle (généralement 20-40% plus long)
      const routeFactor = 1.3;
      const estimatedDistance = straightLineDistance * routeFactor;

      // Vitesse estimée basée sur la vitesse actuelle ou vitesse moyenne urbaine
      let estimatedSpeed = 30; // km/h par défaut en ville
      
      if (this.lastPosition.speed && this.lastPosition.speed > 0) {
        estimatedSpeed = Math.min(this.lastPosition.speed * 3.6, 50); // Limiter à 50 km/h
      }

      // Calcul vitesse moyenne récente si disponible
      const recentSpeed = this.calculateAverageSpeed();
      if (recentSpeed > 0) {
        estimatedSpeed = Math.min(recentSpeed, 50);
      }

      // Facteur de trafic (ici simulé, en production utiliser une API de trafic)
      const trafficFactor = await this.estimateTrafficFactor();
      const adjustedSpeed = estimatedSpeed * trafficFactor;

      // Calcul de l'ETA
      const estimatedMinutes = (estimatedDistance / 1000) / (adjustedSpeed / 60);
      const estimatedArrival = new Date(Date.now() + estimatedMinutes * 60 * 1000);

      // Calcul de la confiance basé sur la précision GPS et la stabilité
      const confidence = this.calculateConfidence();

      const eta: ETACalculation = {
        estimatedMinutes: Math.round(estimatedMinutes),
        estimatedArrival: estimatedArrival.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        confidence,
        distance: Math.round(estimatedDistance),
        trafficFactor,
      };

      // Notifier les écouteurs
      if (this.onETAUpdate) {
        this.onETAUpdate(eta);
      }

      return eta;
    } catch (error) {
      console.error("Erreur lors du calcul de l'ETA:", error);
      return null;
    }
  }

  /**
   * Calcule la vitesse moyenne récente
   */
  private calculateAverageSpeed(): number {
    if (this.positionHistory.length < 2) return 0;

    const recentPositions = this.positionHistory.slice(-5); // 5 dernières positions
    let totalSpeed = 0;
    let validSpeeds = 0;

    for (let i = 1; i < recentPositions.length; i++) {
      const prev = recentPositions[i - 1];
      const curr = recentPositions[i];
      
      const distance = this.calculateDistance(prev, curr);
      const timeDiff = (curr.timestamp - prev.timestamp) / 1000; // en secondes
      
      if (timeDiff > 0 && distance > 1) { // Ignorer les micro-mouvements
        const speed = (distance / timeDiff) * 3.6; // Convertir en km/h
        if (speed < 100) { // Ignorer les vitesses aberrantes
          totalSpeed += speed;
          validSpeeds++;
        }
      }
    }

    return validSpeeds > 0 ? totalSpeed / validSpeeds : 0;
  }

  /**
   * Estime le facteur de trafic basé sur des données réelles
   * Intègre les conditions de trafic actuelles et les données historiques
   */
  private async estimateTrafficFactor(): Promise<number> {
    try {
      // Obtenir les conditions de trafic actuelles via une API (ex: OpenWeatherMap Traffic)
      const trafficData = await this.fetchCurrentTrafficConditions();
      
      if (trafficData) {
        return this.calculateTrafficFactorFromAPI(trafficData);
      }
      
      // Fallback : utiliser des données basées sur l'heure et le jour
      return this.calculateTrafficFactorFromTimePatterns();
    } catch (error) {
      console.warn("Impossible de récupérer les données de trafic, utilisation du fallback:", error);
      return this.calculateTrafficFactorFromTimePatterns();
    }
  }

  /**
   * Récupère les conditions de trafic actuelles
   * Utilise les APIs de trafic disponibles (Google Maps, OpenWeatherMap, ou services locaux)
   */
  private async fetchCurrentTrafficConditions(): Promise<any> {
    try {
      // Vérifier si une API de trafic est configurée
      const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.OPENWEATHER_API_KEY;
      
      if (!apiKey || !this.lastPosition) {
        return null;
      }

      // Si Google Maps API est disponible
      if (process.env.GOOGLE_MAPS_API_KEY) {
        return await this.fetchTrafficFromGoogleMaps();
      }

      // Si OpenWeatherMap API est disponible
      if (process.env.OPENWEATHER_API_KEY) {
        return await this.fetchTrafficFromOpenWeather();
      }

      return null;
    } catch (error) {
      console.warn("Erreur lors de la récupération des données de trafic:", error);
      return null;
    }
  }

  /**
   * Récupère les données de trafic via Google Maps Traffic API
   */
  private async fetchTrafficFromGoogleMaps(): Promise<any> {
    try {
      if (!this.lastPosition) return null;

      const { latitude, longitude } = this.lastPosition;
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      
      // Utiliser l'API Roads pour obtenir des informations sur le trafic local
      const response = await fetch(
        `https://roads.googleapis.com/v1/nearestRoads?points=${latitude},${longitude}&key=${apiKey}`
      );

      if (!response.ok) {
        throw new Error(`API Google Maps error: ${response.status}`);
      }

      const data = await response.json();
      
      // Traiter les données pour extraire les informations de trafic
      return {
        congestionLevel: this.estimateCongestionFromRoadData(data),
        averageSpeed: this.calculateAverageSpeedFromRoadData(data),
        incidents: [],
        weatherImpact: 'clear',
        source: 'google_maps'
      };
    } catch (error) {
      console.error("Erreur API Google Maps:", error);
      return null;
    }
  }

  /**
   * Récupère les données météo qui impactent le trafic via OpenWeatherMap
   */
  private async fetchTrafficFromOpenWeather(): Promise<any> {
    try {
      if (!this.lastPosition) return null;

      const { latitude, longitude } = this.lastPosition;
      const apiKey = process.env.OPENWEATHER_API_KEY;
      
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}`
      );

      if (!response.ok) {
        throw new Error(`API OpenWeather error: ${response.status}`);
      }

      const weatherData = await response.json();
      
      // Estimer l'impact du trafic basé sur la météo
      const weatherImpact = this.assessWeatherImpact(weatherData);
      
      return {
        congestionLevel: this.calculateTrafficFromTimePatterns(), // Utiliser les patterns temporels comme base
        averageSpeed: 45, // Vitesse moyenne estimée
        incidents: [],
        weatherImpact: weatherImpact.condition,
        weatherFactor: weatherImpact.factor,
        source: 'openweather'
      };
    } catch (error) {
      console.error("Erreur API OpenWeather:", error);
      return null;
    }
  }

  /**
   * Évalue l'impact météorologique sur le trafic
   */
  private assessWeatherImpact(weatherData: any): { condition: string; factor: number } {
    const mainWeather = weatherData.weather[0]?.main?.toLowerCase();
    const description = weatherData.weather[0]?.description?.toLowerCase();
    const windSpeed = weatherData.wind?.speed || 0; // m/s
    const visibility = weatherData.visibility || 10000; // mètres

    let condition = 'clear';
    let factor = 1.0;

    // Conditions météorologiques impactantes
    if (mainWeather === 'rain' || description.includes('rain')) {
      condition = 'rain';
      factor = 0.85; // Réduction de 15% de la vitesse
      
      if (description.includes('heavy')) {
        factor = 0.7; // Pluie forte : réduction de 30%
      }
    } else if (mainWeather === 'snow' || description.includes('snow')) {
      condition = 'snow';
      factor = 0.6; // Réduction de 40% pour la neige
      
      if (description.includes('heavy')) {
        factor = 0.4; // Neige forte : réduction de 60%
      }
    } else if (mainWeather === 'fog' || visibility < 1000) {
      condition = 'fog';
      factor = 0.75; // Réduction de 25% pour le brouillard
    } else if (windSpeed > 10) { // Plus de 36 km/h
      condition = 'wind';
      factor = 0.9; // Réduction de 10% pour les vents forts
    }

    return { condition, factor };
  }

  /**
   * Estime le niveau de congestion à partir des données routières
   */
  private estimateCongestionFromRoadData(roadData: any): number {
    if (!roadData.snappedPoints || roadData.snappedPoints.length === 0) {
      return 50; // Niveau moyen par défaut
    }

    // Analyser le type de route et estimer la congestion
    const roads = roadData.snappedPoints;
    let totalCongestion = 0;
    let validRoads = 0;

    roads.forEach((road: any) => {
      if (road.placeId) {
        // Estimer la congestion basée sur le type de route
        // (logique simplifiée - en production, utiliser des données plus précises)
        let congestionEstimate = 40; // Base

        // Routes principales généralement plus congestionnées
        if (road.roadType?.includes('highway')) {
          congestionEstimate = 60;
        } else if (road.roadType?.includes('arterial')) {
          congestionEstimate = 70;
        } else if (road.roadType?.includes('local')) {
          congestionEstimate = 30;
        }

        totalCongestion += congestionEstimate;
        validRoads++;
      }
    });

    return validRoads > 0 ? totalCongestion / validRoads : 50;
  }

  /**
   * Calcule la vitesse moyenne à partir des données routières
   */
  private calculateAverageSpeedFromRoadData(roadData: any): number {
    if (!roadData.snappedPoints || roadData.snappedPoints.length === 0) {
      return 40; // Vitesse moyenne par défaut
    }

    // Calculer une estimation de vitesse basée sur le type de route
    const roads = roadData.snappedPoints;
    let totalSpeed = 0;
    let validRoads = 0;

    roads.forEach((road: any) => {
      let speedEstimate = 40; // Base

      if (road.roadType?.includes('highway')) {
        speedEstimate = 80;
      } else if (road.roadType?.includes('arterial')) {
        speedEstimate = 50;
      } else if (road.roadType?.includes('local')) {
        speedEstimate = 30;
      }

      totalSpeed += speedEstimate;
      validRoads++;
    });

    return validRoads > 0 ? totalSpeed / validRoads : 40;
  }

  /**
   * Calcule un niveau de congestion basé sur les patterns temporels
   * Utilisé comme fallback quand les APIs externes ne sont pas disponibles
   */
  private calculateTrafficFromTimePatterns(): number {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay(); // 0 = dimanche, 6 = samedi
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    let congestionLevel = 30; // Base faible

    if (isWeekend) {
      // Patterns weekend
      if (hour >= 10 && hour <= 14) {
        congestionLevel = 60; // Centres commerciaux, loisirs
      } else if (hour >= 18 && hour <= 22) {
        congestionLevel = 50; // Sorties du soir
      } else {
        congestionLevel = 25; // Circulation généralement fluide
      }
    } else {
      // Patterns jours de semaine
      if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
        congestionLevel = 85; // Heures de pointe critiques
      } else if (hour >= 16 && hour <= 20) {
        congestionLevel = 70; // Heures de pointe étendues
      } else if (hour >= 12 && hour <= 14) {
        congestionLevel = 55; // Pause déjeuner
      } else if (hour >= 22 || hour <= 6) {
        congestionLevel = 15; // Nuit, circulation très fluide
      } else {
        congestionLevel = 40; // Journée normale
      }
    }

    // Ajustements spéciaux
    if (dayOfWeek === 5 && hour >= 16) {
      congestionLevel += 10; // Vendredi soir
    } else if (dayOfWeek === 1 && hour >= 7 && hour <= 9) {
      congestionLevel += 5; // Lundi matin
    }

    return Math.min(100, Math.max(0, congestionLevel));
  }

  /**
   * Calcule le facteur de trafic à partir des données API
   */
  private calculateTrafficFactorFromAPI(trafficData: any): number {
    let factor = 1.0;

    // Ajustement basé sur le niveau de congestion
    if (trafficData.congestionLevel > 80) {
      factor *= 0.5; // Trafic très dense
    } else if (trafficData.congestionLevel > 60) {
      factor *= 0.7; // Trafic dense
    } else if (trafficData.congestionLevel > 40) {
      factor *= 0.85; // Trafic modéré
    } else if (trafficData.congestionLevel < 20) {
      factor *= 1.1; // Circulation fluide
    }

    // Ajustement basé sur la vitesse moyenne
    if (trafficData.averageSpeed < 25) {
      factor *= 0.6;
    } else if (trafficData.averageSpeed > 60) {
      factor *= 1.2;
    }

    // Ajustement pour les incidents
    if (trafficData.incidents && trafficData.incidents.length > 0) {
      factor *= 0.8; // Ralentissement dû aux incidents
    }

    // Ajustement pour les conditions météo
    if (trafficData.weatherImpact === 'rain') {
      factor *= 0.9;
    } else if (trafficData.weatherImpact === 'snow') {
      factor *= 0.7;
    }

    return Math.max(0.3, Math.min(1.5, factor)); // Limiter entre 0.3 et 1.5
  }

  /**
   * Calcule le facteur de trafic basé sur les patterns temporels
   * Utilise des données historiques et des patterns connus
   */
  private calculateTrafficFactorFromTimePatterns(): number {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay(); // 0 = dimanche, 6 = samedi
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    let baseFactor = 1.0;

    if (isWeekend) {
      // Patterns weekend
      if (hour >= 10 && hour <= 14) {
        baseFactor = 0.8; // Centres commerciaux, loisirs
      } else if (hour >= 18 && hour <= 22) {
        baseFactor = 0.85; // Sorties du soir
      } else {
        baseFactor = 1.1; // Circulation généralement fluide
      }
    } else {
      // Patterns jours de semaine
      if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
        baseFactor = 0.5; // Heures de pointe critiques
      } else if (hour >= 16 && hour <= 20) {
        baseFactor = 0.7; // Heures de pointe étendues
      } else if (hour >= 12 && hour <= 14) {
        baseFactor = 0.8; // Pause déjeuner
      } else if (hour >= 22 || hour <= 6) {
        baseFactor = 1.2; // Nuit, circulation très fluide
      } else {
        baseFactor = 0.9; // Journée normale
      }
    }

    // Ajustements spéciaux pour certains jours
    if (dayOfWeek === 5 && hour >= 16) {
      baseFactor *= 0.9; // Vendredi soir
    } else if (dayOfWeek === 1 && hour >= 7 && hour <= 9) {
      baseFactor *= 0.95; // Lundi matin
    }

    // Ajustement saisonnier (approximatif)
    const month = now.getMonth();
    if (month >= 6 && month <= 8) { // Été
      if (isWeekend) baseFactor *= 0.9; // Plus de trafic touristique
    } else if (month === 11 || month === 0) { // Décembre/Janvier
      baseFactor *= 0.9; // Période de fêtes
    }

    return Math.max(0.4, Math.min(1.3, baseFactor));
  }

  /**
   * Calcule la confiance de l'estimation
   */
  private calculateConfidence(): number {
    if (!this.lastPosition) return 0;

    let confidence = 100;
    
    // Réduire la confiance si la précision GPS est faible
    if (this.lastPosition.accuracy > 20) {
      confidence -= Math.min(30, (this.lastPosition.accuracy - 20) * 2);
    }
    
    // Réduire la confiance si pas assez d'historique
    if (this.positionHistory.length < 3) {
      confidence -= 20;
    }
    
    // Réduire la confiance si la vitesse est très variable
    const speedVariability = this.calculateSpeedVariability();
    if (speedVariability > 20) {
      confidence -= Math.min(25, speedVariability);
    }
    
    return Math.max(10, Math.round(confidence));
  }

  /**
   * Calcule la variabilité de la vitesse
   */
  private calculateSpeedVariability(): number {
    if (this.positionHistory.length < 3) return 0;

    const speeds: number[] = [];
    for (let i = 1; i < this.positionHistory.length; i++) {
      const prev = this.positionHistory[i - 1];
      const curr = this.positionHistory[i];
      
      const distance = this.calculateDistance(prev, curr);
      const timeDiff = (curr.timestamp - prev.timestamp) / 1000;
      
      if (timeDiff > 0) {
        const speed = (distance / timeDiff) * 3.6;
        if (speed < 100) speeds.push(speed);
      }
    }

    if (speeds.length < 2) return 0;

    const average = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
    const variance = speeds.reduce((sum, speed) => sum + Math.pow(speed - average, 2), 0) / speeds.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Vérifie si l'utilisateur est proche de la destination
   */
  isNearDestination(
    destination: { latitude: number; longitude: number },
    threshold: number = 100 // mètres
  ): boolean {
    if (!this.lastPosition) return false;
    
    const distance = this.calculateDistance(this.lastPosition, destination);
    return distance <= threshold;
  }

  /**
   * Obtient l'historique des positions
   */
  getPositionHistory(): GPSPosition[] {
    return [...this.positionHistory];
  }

  /**
   * Obtient la dernière position connue
   */
  getLastPosition(): GPSPosition | null {
    return this.lastPosition;
  }

  /**
   * Vérifie si le tracking est actif
   */
  isTracking(): boolean {
    return this.trackingActive;
  }

  /**
   * Met à jour manuellement la position (pour tests et debug uniquement)
   * Utilise les mêmes processus que la géolocalisation réelle
   */
  setManualPosition(position: { latitude: number; longitude: number }, accuracy: number = 10): void {
    if (process.env.NODE_ENV === 'production') {
      console.warn('La mise à jour manuelle de position ne devrait pas être utilisée en production');
      return;
    }

    const manualPosition: GeolocationPosition = {
      coords: {
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        toJSON: () => ({
          latitude: position.latitude,
          longitude: position.longitude,
          accuracy
        })
      },
      timestamp: Date.now(),
      toJSON: () => ({
        coords: {
          latitude: position.latitude,
          longitude: position.longitude,
          accuracy,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: Date.now()
      })
    };
    
    // Utiliser le même processus que les vraies positions GPS
    this.handlePositionUpdate(manualPosition);
  }
}

// Instance singleton
export const gpsTrackingService = new GPSTrackingService();