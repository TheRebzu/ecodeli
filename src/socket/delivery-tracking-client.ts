"use client";

import { DeliveryStatus } from "@prisma/client";
import { Socket } from "socket.io-client";

// Types d'événements de suivi côté client
export enum DeliveryTrackingEventType {
  LOCATION_UPDATE = "LOCATION_UPDATE",
  STATUS_UPDATE = "STATUS_UPDATE",
  ETA_UPDATE = "ETA_UPDATE",
  CHECKPOINT_REACHED = "CHECKPOINT_REACHED",
  ISSUE_REPORTED = "ISSUE_REPORTED",
  ISSUE_RESOLVED = "ISSUE_RESOLVED"}

// Types pour les positions
export interface DeliveryPosition {
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

// Interface pour les mises à jour
export interface DeliveryTrackingUpdate {
  deliveryId: string;
  type: DeliveryTrackingEventType;
  timestamp: Date;
  data: any;
}

/**
 * Classe pour gérer le suivi des livraisons côté client
 */
export class DeliveryTracker {
  private socket: Socket;
  private trackingSubscriptions = new Map<string, boolean>();

  constructor(socket: Socket) {
    this.socket = socket;
  }

  /**
   * Commence à suivre une livraison
   * @param deliveryId ID de la livraison à suivre
   * @returns Promise qui se résout lorsque le suivi est établi
   */
  trackDelivery(deliveryId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (this.trackingSubscriptions.get(deliveryId)) {
        resolve(true); // Déjà en train de suivre
        return;
      }

      this.socket.emit(
        "track_delivery",
        deliveryId,
        (response: { success: boolean; error?: string }) => {
          if (response.success) {
            this.trackingSubscriptions.set(deliveryId, true);
            resolve(true);
          } else {
            reject(new Error(response.error || "Échec du suivi de livraison"));
          }
        },
      );
    });
  }

  /**
   * Arrête de suivre une livraison
   * @param deliveryId ID de la livraison à arrêter de suivre
   */
  untrackDelivery(deliveryId: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.socket.emit(
        "untrack_delivery",
        deliveryId,
        (response: { success }) => {
          if (response.success) {
            this.trackingSubscriptions.delete(deliveryId);
          }
          resolve(response.success);
        },
      );
    });
  }

  /**
   * S'abonne aux mises à jour de position d'une livraison
   * @param deliveryId ID de la livraison
   * @param callback Fonction appelée lors des mises à jour
   */
  onLocationUpdate(
    deliveryId: string,
    callback: (position: DeliveryPosition) => void,
  ): () => void {
    const eventName = `delivery:${deliveryId}:location`;
    this.socket.on(eventName, callback);
    return () => this.socket.off(eventName, callback);
  }

  /**
   * S'abonne aux mises à jour de statut d'une livraison
   * @param deliveryId ID de la livraison
   * @param callback Fonction appelée lors des mises à jour
   */
  onStatusUpdate(
    deliveryId: string,
    callback: (data: {
      status: DeliveryStatus;
      previousStatus?: DeliveryStatus;
      notes?: string;
    }) => void,
  ): () => void {
    const eventName = `delivery:${deliveryId}:status`;
    this.socket.on(eventName, callback);
    return () => this.socket.off(eventName, callback);
  }

  /**
   * S'abonne aux mises à jour d'ETA d'une livraison
   * @param deliveryId ID de la livraison
   * @param callback Fonction appelée lors des mises à jour
   */
  onETAUpdate(
    deliveryId: string,
    callback: (data: {
      estimatedTime: Date;
      distanceRemaining?: number;
    }) => void,
  ): () => void {
    const eventName = `delivery:${deliveryId}:eta`;
    this.socket.on(eventName, callback);
    return () => this.socket.off(eventName, callback);
  }

  /**
   * Pour les livreurs: met à jour la position d'une livraison
   * @param deliveryId ID de la livraison
   * @param position Nouvelle position
   */
  updateDeliveryPosition(
    deliveryId: string,
    position: DeliveryPosition,
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.socket.emit(
        "update_position",
        {
          deliveryId,
          ...position},
        (response: { success: boolean; error?: string }) => {
          if (response.success) {
            resolve(true);
          } else {
            reject(
              new Error(response.error || "Échec de mise à jour de position"),
            );
          }
        },
      );
    });
  }

  /**
   * Pour les livreurs: met à jour le statut d'une livraison
   * @param deliveryId ID de la livraison
   * @param status Nouveau statut
   * @param notes Notes optionnelles
   */
  updateDeliveryStatus(
    deliveryId: string,
    status: DeliveryStatus,
    notes?: string,
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.socket.emit(
        "update_status",
        {
          deliveryId,
          status,
          notes},
        (response: { success: boolean; error?: string }) => {
          if (response.success) {
            resolve(true);
          } else {
            reject(
              new Error(response.error || "Échec de mise à jour de statut"),
            );
          }
        },
      );
    });
  }
}
