import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { shallow } from "zustand/shallow";
import { DeliveryStatus } from "@prisma/client";
import {
  connectSocket,
  disconnectSocket,
  DeliveryPosition,
  DeliveryTrackingEvent,
  socket,
  GeoPoint,
} from "@/socket";
import { debounce, throttle } from "lodash";

// Types pour le store
type DeliveryInfo = {
  id: string;
  status: DeliveryStatus;
  pickupAddress: string;
  deliveryAddress: string;
  estimatedArrival: Date | null;
  currentLat: number | null;
  currentLng: number | null;
  lastLocationUpdate: Date | null;
  deliverer: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
};

type EtaInfo = {
  eta: Date;
  distance: number;
  timestamp: Date;
};

type CheckpointInfo = {
  id: string;
  type: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  notes: string | null;
};

type StatusHistoryItem = {
  status: DeliveryStatus;
  previousStatus: DeliveryStatus | null;
  timestamp: Date;
  notes: string | null;
};

type ReportedIssue = {
  id: string;
  type: string;
  severity: string;
  description: string;
  timestamp: Date;
  resolved: boolean;
  resolutionNotes: string | null;
};

// Métriques calculées
type DeliveryMetrics = {
  distanceTraveled: number; // mètres
  remainingDistance: number; // mètres
  remainingTime: number; // secondes
  averageSpeed: number; // km/h
  estimatedTimeOfArrival: Date | null;
  completionPercentage: number; // 0-100
};

// État de connexion
type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

// État du store
type DeliveryTrackingState = {
  // Livraison actuellement suivie
  currentDeliveryId: string | null;
  // Informations générales sur la livraison
  deliveryInfo: DeliveryInfo | null;
  // Historique des positions
  positionHistory: DeliveryPosition[];
  // Position actuelle
  currentPosition: DeliveryPosition | null;
  // Historique des ETAs
  etaHistory: EtaInfo[];
  // Dernier ETA reçu
  lastEta: EtaInfo | null;
  // Points de passage
  checkpoints: CheckpointInfo[];
  // Historique des changements de statut
  statusHistory: StatusHistoryItem[];
  // Problèmes signalés
  reportedIssues: ReportedIssue[];
  // Métriques calculées
  metrics: DeliveryMetrics;
  // État de la connexion
  connectionState: ConnectionState;
  // Erreur de connexion
  connectionError: string | null;
  // Horodatage de la dernière mise à jour
  lastUpdateTime: Date | null;
  // Indicateur de mode hors ligne
  isOffline: boolean;
};

// Actions du store
type DeliveryTrackingActions = {
  // Commencer à suivre une livraison
  startTracking: (deliveryId: string) => Promise<boolean>;
  // Arrêter le suivi
  stopTracking: () => void;
  // Mettre à jour la position (pour les livreurs)
  updatePosition: (
    position: Omit<DeliveryPosition, "timestamp">,
  ) => Promise<boolean>;
  // Se reconnecter au serveur
  reconnect: () => void;
  // Rafraîchir l'état initial
  refreshDeliveryState: () => Promise<boolean>;
  // Récupérer les métriques calculées
  getMetrics: () => DeliveryMetrics;
  // Vérifier si le mode hors ligne est actif
  isOfflineMode: () => boolean;
  // Activer/désactiver le mode hors ligne
  toggleOfflineMode: (value?: boolean) => void;
  // Signaler un problème (pour les livreurs)
  reportIssue: (
    type: string,
    severity: string,
    description: string,
  ) => Promise<boolean>;
  // Résoudre un problème signalé
  resolveIssue: (issueId: string, resolutionNotes: string) => Promise<boolean>;
  // Nettoyer le store
  reset: () => void;
};

// Calcul de la distance entre deux points géographiques (Haversine)
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // rayon de la Terre en mètres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // en mètres
}

// Calculer le temps restant en secondes
function calculateRemainingTime(
  distance: number,
  averageSpeed: number,
  currentTime: Date,
): number {
  if (averageSpeed <= 0) return Infinity;
  // Convertir la vitesse de km/h à m/s
  const speedInMetersPerSecond = (averageSpeed * 1000) / 3600;
  return distance / speedInMetersPerSecond;
}

// État initial des métriques
const initialMetrics: DeliveryMetrics = {
  distanceTraveled: 0,
  remainingDistance: 0,
  remainingTime: 0,
  averageSpeed: 0,
  estimatedTimeOfArrival: null,
  completionPercentage: 0,
};

// Durée de vie du cache en minutes
const CACHE_EXPIRY_TIME = 60;

// Créer le store
export const useDeliveryTrackingStore = create<
  DeliveryTrackingState & DeliveryTrackingActions
>()(
  persist(
    immer((set, get) => ({
      // État initial
      currentDeliveryId: null,
      deliveryInfo: null,
      positionHistory: [],
      currentPosition: null,
      etaHistory: [],
      lastEta: null,
      checkpoints: [],
      statusHistory: [],
      reportedIssues: [],
      metrics: { ...initialMetrics },
      connectionState: "disconnected",
      connectionError: null,
      lastUpdateTime: null,
      isOffline: false,

      // Actions
      startTracking: async (deliveryId: string) => {
        try {
          // Si déjà en train de suivre cette livraison
          if (
            get().currentDeliveryId === deliveryId &&
            get().connectionState === "connected"
          ) {
            return true;
          }

          set((state) => {
            state.currentDeliveryId = deliveryId;
            state.connectionState = "connecting";
            state.connectionError = null;
          });

          // Vérifier s'il y a des données en cache
          const cachedState = get();

          // Si en mode hors ligne, utiliser uniquement les données en cache
          if (get().isOffline) {
            // Calculer les métriques à partir des données en cache
            set((state) => {
              state.connectionState = "disconnected";
              state.lastUpdateTime = new Date();

              // Recalculer les métriques avec les données en cache
              const metrics = calculateMetrics(state);
              state.metrics = metrics;
            });
            return true;
          }

          // Sinon, se connecter au serveur
          const token = localStorage.getItem("auth-token");
          if (!token) {
            set((state) => {
              state.connectionState = "error";
              state.connectionError = "Token d'authentification manquant";
            });
            return false;
          }

          // Configurer les écouteurs d'événements
          setupSocketListeners();

          // Se connecter au socket
          connectSocket(token);

          // Démarrer le suivi de la livraison
          return new Promise((resolve) => {
            socket.emit(
              "track_delivery",
              deliveryId,
              (response: { success: boolean; error?: string }) => {
                if (response.success) {
                  set((state) => {
                    state.connectionState = "connected";
                    state.lastUpdateTime = new Date();
                  });
                  resolve(true);
                } else {
                  set((state) => {
                    state.connectionState = "error";
                    state.connectionError =
                      response.error || "Erreur lors du suivi de la livraison";
                  });
                  resolve(false);
                }
              },
            );
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Erreur inconnue";
          set((state) => {
            state.connectionState = "error";
            state.connectionError = errorMessage;
          });
          return false;
        }
      },

      stopTracking: () => {
        const deliveryId = get().currentDeliveryId;
        if (deliveryId) {
          socket.emit("untrack_delivery", deliveryId);
        }

        // Nettoyer les écouteurs d'événements
        cleanupSocketListeners();

        // Se déconnecter du socket
        disconnectSocket();

        set((state) => {
          state.connectionState = "disconnected";
          // Ne pas effacer les données, elles peuvent être utiles hors ligne
        });
      },

      updatePosition: async (position) => {
        const deliveryId = get().currentDeliveryId;
        if (!deliveryId) return false;

        try {
          // Si en mode hors ligne, stocker localement
          if (get().isOffline) {
            const newPosition: DeliveryPosition = {
              ...position,
              timestamp: new Date(),
            };

            set((state) => {
              state.currentPosition = newPosition;
              state.positionHistory.push(newPosition);
              state.lastUpdateTime = new Date();

              // Recalculer les métriques
              const metrics = calculateMetrics(state);
              state.metrics = metrics;
            });

            return true;
          }

          // Sinon, envoyer au serveur
          return new Promise((resolve) => {
            socket.emit(
              "update_position",
              {
                deliveryId,
                ...position,
              },
              (response: { success: boolean; error?: string }) => {
                resolve(response.success);
              },
            );
          });
        } catch (error) {
          console.error("Erreur lors de la mise à jour de la position:", error);
          return false;
        }
      },

      reconnect: () => {
        const deliveryId = get().currentDeliveryId;
        if (!deliveryId) return;

        set((state) => {
          state.connectionState = "connecting";
          state.connectionError = null;
        });

        // Se reconnecter au socket
        const token = localStorage.getItem("auth-token");
        if (!token) {
          set((state) => {
            state.connectionState = "error";
            state.connectionError = "Token d'authentification manquant";
          });
          return;
        }

        // Configurer les écouteurs d'événements
        setupSocketListeners();

        // Se connecter au socket
        connectSocket(token);

        // Reprendre le suivi
        socket.emit(
          "track_delivery",
          deliveryId,
          (response: { success: boolean; error?: string }) => {
            if (response.success) {
              set((state) => {
                state.connectionState = "connected";
                state.lastUpdateTime = new Date();
              });
            } else {
              set((state) => {
                state.connectionState = "error";
                state.connectionError =
                  response.error || "Erreur lors de la reconnexion";
              });
            }
          },
        );
      },

      refreshDeliveryState: async () => {
        const deliveryId = get().currentDeliveryId;
        if (!deliveryId) return false;

        // Si en mode hors ligne, ne pas rafraîchir
        if (get().isOffline) return false;

        // Si déconnecté, essayer de se reconnecter
        if (get().connectionState !== "connected") {
          get().reconnect();
          return false;
        }

        // Arrêter et redémarrer le suivi pour obtenir l'état initial complet
        socket.emit("untrack_delivery", deliveryId);

        return new Promise((resolve) => {
          socket.emit(
            "track_delivery",
            deliveryId,
            (response: { success: boolean; error?: string }) => {
              if (response.success) {
                set((state) => {
                  state.lastUpdateTime = new Date();
                });
              }
              resolve(response.success);
            },
          );
        });
      },

      getMetrics: () => {
        // Recalculer les métriques à la demande pour avoir les valeurs les plus à jour
        const metrics = calculateMetrics(get());

        // Mettre à jour les métriques dans le store
        set((state) => {
          state.metrics = metrics;
        });

        return metrics;
      },

      isOfflineMode: () => {
        return get().isOffline;
      },

      toggleOfflineMode: (value) => {
        const newValue = value !== undefined ? value : !get().isOffline;

        set((state) => {
          state.isOffline = newValue;
        });

        // Si passage en mode en ligne, essayer de se reconnecter
        if (!newValue && get().currentDeliveryId) {
          get().reconnect();
        }

        // Si passage en mode hors ligne, se déconnecter mais garder les données
        if (newValue) {
          disconnectSocket();
          set((state) => {
            state.connectionState = "disconnected";
          });
        }
      },

      reportIssue: async (type, severity, description) => {
        const deliveryId = get().currentDeliveryId;
        if (!deliveryId) return false;

        // Si en mode hors ligne, stocker localement
        if (get().isOffline) {
          const newIssue: ReportedIssue = {
            id: `local-${Date.now()}`,
            type,
            severity,
            description,
            timestamp: new Date(),
            resolved: false,
            resolutionNotes: null,
          };

          set((state) => {
            state.reportedIssues.push(newIssue);
            state.lastUpdateTime = new Date();
          });

          return true;
        }

        // Signaler le problème via l'API réelle
        try {
          const response = await api.deliverer.tracking.reportIssue.mutate({
            deliveryId: get().currentDeliveryId!,
            type,
            severity,
            description,
          });
          return response.success;
        } catch (error) {
          console.error('Erreur lors du signalement du problème:', error);
          return false;
        }
      },

      resolveIssue: async (issueId, resolutionNotes) => {
        // Si en mode hors ligne, mettre à jour localement
        if (get().isOffline) {
          set((state) => {
            const issueIndex = state.reportedIssues.findIndex(
              (issue) => issue.id === issueId,
            );
            if (issueIndex !== -1) {
              state.reportedIssues[issueIndex].resolved = true;
              state.reportedIssues[issueIndex].resolutionNotes =
                resolutionNotes;
              state.lastUpdateTime = new Date();
            }
          });

          return true;
        }

        // Résoudre le problème via l'API réelle
        try {
          const response = await api.deliverer.tracking.resolveIssue.mutate({
            issueId,
            resolutionNotes,
          });
          return response.success;
        } catch (error) {
          console.error('Erreur lors de la résolution du problème:', error);
          return false;
        }
      },

      reset: () => {
        // Arrêter le suivi
        get().stopTracking();

        // Réinitialiser l'état
        set((state) => {
          state.currentDeliveryId = null;
          state.deliveryInfo = null;
          state.positionHistory = [];
          state.currentPosition = null;
          state.etaHistory = [];
          state.lastEta = null;
          state.checkpoints = [];
          state.statusHistory = [];
          state.reportedIssues = [];
          state.metrics = { ...initialMetrics };
          state.connectionState = "disconnected";
          state.connectionError = null;
          state.lastUpdateTime = null;
          state.isOffline = false;
        });
      },
    })),
    {
      name: "delivery-tracking-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Ne pas persister ces valeurs
        currentDeliveryId: state.currentDeliveryId,
        deliveryInfo: state.deliveryInfo,
        positionHistory: state.positionHistory.slice(-50), // Limiter le nombre d'entrées
        currentPosition: state.currentPosition,
        etaHistory: state.etaHistory.slice(-10),
        lastEta: state.lastEta,
        checkpoints: state.checkpoints,
        statusHistory: state.statusHistory.slice(-20),
        reportedIssues: state.reportedIssues,
        metrics: state.metrics,
        lastUpdateTime: state.lastUpdateTime,
        isOffline: state.isOffline,
      }),
      // Vérifier l'expiration du cache
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        const lastUpdate = state.lastUpdateTime;
        if (!lastUpdate) return;

        const expiryTime = new Date(
          lastUpdate.getTime() + CACHE_EXPIRY_TIME * 60 * 1000,
        );
        if (new Date() > expiryTime) {
          // Le cache a expiré, réinitialiser l'état
          state.reset();
        }
      },
    },
  ),
);

// Fonction pour calculer les métriques à partir de l'état
function calculateMetrics(state: DeliveryTrackingState): DeliveryMetrics {
  const { positionHistory, currentPosition, lastEta, deliveryInfo } = state;

  // Valeurs par défaut
  let distanceTraveled = 0;
  let remainingDistance = lastEta?.distance ?? 0;
  let averageSpeed = 0;
  let remainingTime = 0;
  let estimatedTimeOfArrival = lastEta?.eta ?? null;
  let completionPercentage = 0;

  // Calculer la distance parcourue
  if (positionHistory.length >= 2) {
    for (let i = 1; i < positionHistory.length; i++) {
      const prev = positionHistory[i - 1];
      const curr = positionHistory[i];

      distanceTraveled += calculateDistance(
        prev.latitude,
        prev.longitude,
        curr.latitude,
        curr.longitude,
      );
    }
  }

  // Calculer la vitesse moyenne
  if (positionHistory.length >= 2) {
    const first = positionHistory[0];
    const last = positionHistory[positionHistory.length - 1];

    const timeElapsed =
      (last.timestamp.getTime() - first.timestamp.getTime()) / 1000; // en secondes

    if (timeElapsed > 0) {
      // Convertir m/s en km/h
      averageSpeed = (distanceTraveled / timeElapsed) * 3.6;
    }
  }

  // Calculer le temps restant
  if (remainingDistance > 0 && averageSpeed > 0) {
    remainingTime = calculateRemainingTime(
      remainingDistance,
      averageSpeed,
      new Date(),
    );

    // Calculer l'heure d'arrivée estimée
    if (remainingTime !== Infinity) {
      estimatedTimeOfArrival = new Date(Date.now() + remainingTime * 1000);
    }
  }

  // Calculer le pourcentage d'achèvement
  if (distanceTraveled > 0 || remainingDistance > 0) {
    const totalDistance = distanceTraveled + remainingDistance;
    completionPercentage = Math.min(
      100,
      Math.round((distanceTraveled / totalDistance) * 100),
    );
  }

  return {
    distanceTraveled,
    remainingDistance,
    remainingTime,
    averageSpeed,
    estimatedTimeOfArrival,
    completionPercentage,
  };
}

// Configurer les écouteurs d'événements pour le socket
function setupSocketListeners() {
  // Nettoyer d'abord les écouteurs existants pour éviter les doublons
  cleanupSocketListeners();

  // État initial de la livraison
  socket.on("delivery_initial_state", handleInitialState);

  // Mises à jour de position
  socket.on("position_update", handlePositionUpdate);

  // Mises à jour de statut
  socket.on("status_update", handleStatusUpdate);

  // Mises à jour d'ETA
  socket.on("eta_update", handleEtaUpdate);

  // Points de passage atteints
  socket.on("checkpoint_reached", handleCheckpointReached);

  // Problèmes signalés
  socket.on("issue_reported", handleIssueReported);

  // Événements de connexion
  socket.on("connect", handleConnect);
  socket.on("disconnect", handleDisconnect);
  socket.on("connect_error", handleConnectError);
}

// Nettoyer les écouteurs d'événements
function cleanupSocketListeners() {
  socket.off("delivery_initial_state", handleInitialState);
  socket.off("position_update", handlePositionUpdate);
  socket.off("status_update", handleStatusUpdate);
  socket.off("eta_update", handleEtaUpdate);
  socket.off("checkpoint_reached", handleCheckpointReached);
  socket.off("issue_reported", handleIssueReported);
  socket.off("connect", handleConnect);
  socket.off("disconnect", handleDisconnect);
  socket.off("connect_error", handleConnectError);
}

// Gestionnaire pour l'état initial
function handleInitialState(data: any) {
  useDeliveryTrackingStore.setState((state) => {
    state.deliveryInfo = data.delivery;
    state.currentPosition = data.lastPosition;

    if (data.lastPosition) {
      state.positionHistory.push(data.lastPosition);
    }

    state.lastEta = data.lastEta;

    if (data.lastEta) {
      state.etaHistory.push(data.lastEta);
    }

    state.checkpoints = data.checkpoints || [];
    state.statusHistory = data.statusHistory || [];
    state.lastUpdateTime = new Date();

    // Calculer les métriques initiales
    state.metrics = calculateMetrics(state);
  });
}

// Gestionnaire pour les mises à jour de position
// Utiliser throttle pour limiter les mises à jour fréquentes
const handlePositionUpdate = throttle((event: any) => {
  if (event.type !== "POSITION_UPDATE" || !event.position) return;

  useDeliveryTrackingStore.setState((state) => {
    const newPosition = event.position;

    // Mettre à jour la position actuelle
    state.currentPosition = newPosition;

    // Ajouter à l'historique des positions
    state.positionHistory.push(newPosition);

    // Limiter la taille de l'historique pour éviter les problèmes de mémoire
    if (state.positionHistory.length > 1000) {
      state.positionHistory = state.positionHistory.slice(-1000);
    }

    // Mettre à jour les informations de livraison
    if (state.deliveryInfo) {
      state.deliveryInfo.currentLat = newPosition.latitude;
      state.deliveryInfo.currentLng = newPosition.longitude;
      state.deliveryInfo.lastLocationUpdate = newPosition.timestamp;
    }

    state.lastUpdateTime = new Date();

    // Recalculer les métriques
    state.metrics = calculateMetrics(state);
  });
}, 1000); // Throttle à 1 seconde

// Gestionnaire pour les mises à jour de statut
function handleStatusUpdate(event: any) {
  if (event.type !== "STATUS_UPDATE") return;

  useDeliveryTrackingStore.setState((state) => {
    // Mettre à jour le statut de la livraison
    if (state.deliveryInfo) {
      state.deliveryInfo.status = event.status;
    }

    // Ajouter à l'historique des statuts
    state.statusHistory.push({
      status: event.status,
      previousStatus: event.previousStatus,
      timestamp: new Date(),
      notes: event.notes || null,
    });

    state.lastUpdateTime = new Date();
  });
}

// Gestionnaire pour les mises à jour d'ETA
function handleEtaUpdate(event: any) {
  if (event.type !== "ETA_UPDATE") return;

  useDeliveryTrackingStore.setState((state) => {
    const etaInfo: EtaInfo = {
      eta: event.eta,
      distance: event.distance,
      timestamp: new Date(),
    };

    // Mettre à jour le dernier ETA
    state.lastEta = etaInfo;

    // Ajouter à l'historique des ETAs
    state.etaHistory.push(etaInfo);

    state.lastUpdateTime = new Date();

    // Recalculer les métriques
    state.metrics = calculateMetrics(state);
  });
}

// Gestionnaire pour les points de passage
function handleCheckpointReached(event: any) {
  if (event.type !== "CHECKPOINT_REACHED") return;

  useDeliveryTrackingStore.setState((state) => {
    const checkpoint: CheckpointInfo = {
      id: event.checkpointId,
      type: event.type,
      latitude: event.location.coordinates[1], // [long, lat] -> lat
      longitude: event.location.coordinates[0], // [long, lat] -> long
      timestamp: new Date(),
      notes: null,
    };

    // Ajouter le point de passage
    state.checkpoints.push(checkpoint);

    state.lastUpdateTime = new Date();
  });
}

// Gestionnaire pour les problèmes signalés
function handleIssueReported(event: any) {
  if (event.type !== "ISSUE_REPORTED") return;

  useDeliveryTrackingStore.setState((state) => {
    const issue: ReportedIssue = {
      id: event.issueId,
      type: event.type,
      severity: event.severity,
      description: event.description,
      timestamp: new Date(),
      resolved: false,
      resolutionNotes: null,
    };

    // Ajouter le problème
    state.reportedIssues.push(issue);

    state.lastUpdateTime = new Date();
  });
}

// Gestionnaire de connexion
function handleConnect() {
  useDeliveryTrackingStore.setState((state) => {
    state.connectionState = "connected";
    state.connectionError = null;
  });
}

// Gestionnaire de déconnexion
function handleDisconnect() {
  useDeliveryTrackingStore.setState((state) => {
    state.connectionState = "disconnected";
  });
}

// Gestionnaire d'erreur de connexion
function handleConnectError(error: Error) {
  useDeliveryTrackingStore.setState((state) => {
    state.connectionState = "error";
    state.connectionError = error.message;
  });
}

// Hooks dérivés pour des sélections optimisées

// Hook pour obtenir uniquement la position actuelle
export function useCurrentPosition() {
  return useDeliveryTrackingStore(
    (state) => ({
      position: state.currentPosition,
      lastUpdateTime: state.lastUpdateTime,
    }),
    shallow,
  );
}

// Hook pour obtenir uniquement les métriques
export function useDeliveryMetrics() {
  const getMetrics = useDeliveryTrackingStore((state) => state.getMetrics);
  return getMetrics();
}

// Hook pour obtenir l'état de la connexion
export function useConnectionState() {
  return useDeliveryTrackingStore(
    (state) => ({
      connectionState: state.connectionState,
      connectionError: state.connectionError,
      isOffline: state.isOffline,
      toggleOfflineMode: state.toggleOfflineMode,
      reconnect: state.reconnect,
    }),
    shallow,
  );
}

// Hook pour obtenir l'historique des statuts
export function useStatusHistory() {
  return useDeliveryTrackingStore((state) => state.statusHistory);
}

// Hook pour obtenir les informations de livraison
export function useDeliveryInfo() {
  return useDeliveryTrackingStore((state) => state.deliveryInfo);
}

// Hook pour contrôler le suivi
export function useDeliveryTracking() {
  return useDeliveryTrackingStore(
    (state) => ({
      currentDeliveryId: state.currentDeliveryId,
      startTracking: state.startTracking,
      stopTracking: state.stopTracking,
      refreshDeliveryState: state.refreshDeliveryState,
      reset: state.reset,
    }),
    shallow,
  );
}
