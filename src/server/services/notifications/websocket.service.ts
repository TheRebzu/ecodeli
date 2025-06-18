import { WebSocket, WebSocketServer } from 'ws';
import { db } from '@/server/db';
import { UserRole } from '@prisma/client';

export interface WebSocketMessage {
  type: 'ANNOUNCEMENT_UPDATE' | 'DELIVERY_UPDATE' | 'NOTIFICATION' | 'SYSTEM_ALERT';
  data: any;
  targetRole?: UserRole;
  targetUserId?: string;
  timestamp: Date;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocket> = new Map();
  private userConnections: Map<string, string[]> = new Map();

  initialize(server: any) {
    this.wss = new WebSocketServer({ server });
    
    this.wss.on('connection', (ws: WebSocket, request) => {
      console.log('Nouvelle connexion WebSocket');
      
      // Générer un ID unique pour la connexion
      const connectionId = this.generateConnectionId();
      this.clients.set(connectionId, ws);

      ws.on('message', (message: string) => {
        try {
          const parsedMessage = JSON.parse(message);
          this.handleClientMessage(connectionId, parsedMessage);
        } catch (error) {
          console.error('Erreur parsing message WebSocket:', error);
        }
      });

      ws.on('close', () => {
        console.log('Connexion WebSocket fermée');
        this.removeConnection(connectionId);
      });

      ws.on('error', (error) => {
        console.error('Erreur WebSocket:', error);
        this.removeConnection(connectionId);
      });
    });

    console.log('Service WebSocket initialisé');
  }

  private generateConnectionId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private handleClientMessage(connectionId: string, message: any) {
    switch (message.type) {
      case 'AUTH':
        this.authenticateConnection(connectionId, message.userId, message.token);
        break;
      case 'SUBSCRIBE':
        this.subscribeToChannel(connectionId, message.channel);
        break;
      case 'PING':
        this.sendToConnection(connectionId, { type: 'PONG', timestamp: new Date() });
        break;
      default:
        console.log('Type de message inconnu:', message.type);
    }
  }

  private async authenticateConnection(connectionId: string, userId: string, token: string) {
    try {
      // Vérifier le token et l'utilisateur
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, status: true }
      });

      if (!user || user.status !== 'ACTIVE') {
        this.sendToConnection(connectionId, { 
          type: 'AUTH_ERROR', 
          message: 'Utilisateur non autorisé' 
        });
        return;
      }

      // Associer la connexion à l'utilisateur
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, []);
      }
      this.userConnections.get(userId)!.push(connectionId);

      this.sendToConnection(connectionId, { 
        type: 'AUTH_SUCCESS', 
        userId, 
        role: user.role 
      });

      console.log(`Utilisateur ${userId} authentifié sur la connexion ${connectionId}`);
    } catch (error) {
      console.error('Erreur authentification WebSocket:', error);
      this.sendToConnection(connectionId, { 
        type: 'AUTH_ERROR', 
        message: 'Erreur serveur' 
      });
    }
  }

  private subscribeToChannel(connectionId: string, channel: string) {
    // Logique d'abonnement aux channels spécifiques
    console.log(`Connexion ${connectionId} abonnée au channel ${channel}`);
    this.sendToConnection(connectionId, { 
      type: 'SUBSCRIBED', 
      channel 
    });
  }

  private sendToConnection(connectionId: string, message: any) {
    const ws = this.clients.get(connectionId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private removeConnection(connectionId: string) {
    this.clients.delete(connectionId);
    
    // Retirer la connexion des associations utilisateur
    for (const [userId, connections] of this.userConnections.entries()) {
      const index = connections.indexOf(connectionId);
      if (index > -1) {
        connections.splice(index, 1);
        if (connections.length === 0) {
          this.userConnections.delete(userId);
        }
        break;
      }
    }
  }

  // Méthodes publiques pour envoyer des notifications

  async sendToUser(userId: string, message: WebSocketMessage) {
    const connections = this.userConnections.get(userId);
    if (connections) {
      connections.forEach(connectionId => {
        this.sendToConnection(connectionId, message);
      });
    }
  }

  async sendToRole(role: UserRole, message: WebSocketMessage) {
    try {
      const users = await db.user.findMany({
        where: { role, status: 'ACTIVE' },
        select: { id: true }
      });

      for (const user of users) {
        await this.sendToUser(user.id, message);
      }
    } catch (error) {
      console.error('Erreur envoi message par rôle:', error);
    }
  }

  async broadcastToAll(message: WebSocketMessage) {
    this.clients.forEach((ws, connectionId) => {
      this.sendToConnection(connectionId, message);
    });
  }

  // Méthodes spécialisées pour les différents types de notifications

  async notifyNewAnnouncement(announcement: any) {
    const message: WebSocketMessage = {
      type: 'ANNOUNCEMENT_UPDATE',
      data: {
        action: 'NEW_ANNOUNCEMENT',
        announcement,
      },
      targetRole: 'DELIVERER',
      timestamp: new Date(),
    };

    await this.sendToRole('DELIVERER', message);
  }

  async notifyAnnouncementUpdate(announcementId: string, updates: any, affectedUserIds?: string[]) {
    const message: WebSocketMessage = {
      type: 'ANNOUNCEMENT_UPDATE',
      data: {
        action: 'ANNOUNCEMENT_UPDATED',
        announcementId,
        updates,
      },
      timestamp: new Date(),
    };

    if (affectedUserIds) {
      for (const userId of affectedUserIds) {
        await this.sendToUser(userId, message);
      }
    } else {
      await this.sendToRole('DELIVERER', message);
    }
  }

  async notifyDeliveryUpdate(deliveryId: string, status: string, clientId: string, delivererId?: string) {
    const message: WebSocketMessage = {
      type: 'DELIVERY_UPDATE',
      data: {
        deliveryId,
        status,
        timestamp: new Date(),
      },
      timestamp: new Date(),
    };

    // Notifier le client
    await this.sendToUser(clientId, message);

    // Notifier le livreur si assigné
    if (delivererId) {
      await this.sendToUser(delivererId, message);
    }
  }

  async notifySystemAlert(alert: any, targetRole?: UserRole, targetUserId?: string) {
    const message: WebSocketMessage = {
      type: 'SYSTEM_ALERT',
      data: alert,
      targetRole,
      targetUserId,
      timestamp: new Date(),
    };

    if (targetUserId) {
      await this.sendToUser(targetUserId, message);
    } else if (targetRole) {
      await this.sendToRole(targetRole, message);
    } else {
      await this.broadcastToAll(message);
    }
  }

  getConnectionStats() {
    return {
      totalConnections: this.clients.size,
      authenticatedUsers: this.userConnections.size,
      connectionsPerUser: Array.from(this.userConnections.entries()).map(([userId, connections]) => ({
        userId,
        connectionCount: connections.length
      }))
    };
  }
}

export const webSocketService = new WebSocketService();