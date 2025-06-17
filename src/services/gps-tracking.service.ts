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
      const trafficFactor = this.estimateTrafficFactor();
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
   * Estime le facteur de trafic (simulation)
   * En production, utiliser une API de trafic réel
   */
  private estimateTrafficFactor(): number {
    const hour = new Date().getHours();
    
    // Heures de pointe
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      return 0.6; // Trafic dense, vitesse réduite de 40%
    }
    
    // Heures de déjeuner
    if (hour >= 12 && hour <= 14) {
      return 0.8; // Trafic modéré
    }
    
    // Soirée/nuit
    if (hour >= 22 || hour <= 6) {
      return 1.1; // Circulation fluide
    }
    
    return 0.9; // Trafic normal
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
   * Simule une mise à jour de position (pour les tests)
   */
  simulatePosition(position: { latitude: number; longitude: number }): void {
    const simulatedPosition: GeolocationPosition = {
      coords: {
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null
      },
      timestamp: Date.now()
    };
    
    this.handlePositionUpdate(simulatedPosition);
  }
}

// Instance singleton
export const gpsTrackingService = new GPSTrackingService();