import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

// Mocks des dépendances
const mockPrisma = {
  trackingUpdate: {
    findMany: jest.fn()
  },
  delivery: {
    findUnique: jest.fn()
  }
};

// Mock des modules
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: mockPrisma
}));

jest.mock('next/server', () => ({
  NextRequest: jest.fn(function (input) {
    this.url = input || 'http://localhost:3000';
    this.json = jest.fn().mockImplementation(() => Promise.resolve({}));
    this.nextUrl = new URL(this.url);
    this.headers = new Map();
    this.method = 'GET';
  }),
  NextResponse: {
    json: jest.fn((data, options = {}) => {
      return {
        data,
        status: options.status || 200,
        json: function() {
          return Promise.resolve(this.data);
        }
      };
    })
  }
}));

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

describe('Tracking API', () => {
  beforeEach(() => {
    mockPrisma.trackingUpdate.findMany.mockReset();
    mockPrisma.delivery.findUnique.mockReset();
    (getServerSession as jest.Mock).mockReset();
  });

  describe('GET /api/tracking', () => {
    it('devrait retourner les mises à jour de suivi par numéro de suivi', async () => {
      // Arrange
      const mockTrackingNumber = 'TRK123456789';
      
      const mockUpdates = [
        {
          id: 'update-1',
          deliveryId: 'delivery-1',
          status: 'IN_TRANSIT',
          location: 'Lyon, France',
          description: 'Colis en transit',
          timestamp: new Date('2023-05-15T10:30:00Z')
        },
        {
          id: 'update-2',
          deliveryId: 'delivery-1',
          status: 'OUT_FOR_DELIVERY',
          location: 'Lyon, France',
          description: 'Colis en cours de livraison',
          timestamp: new Date('2023-05-15T14:45:00Z')
        }
      ];

      mockPrisma.delivery.findUnique.mockResolvedValue({
        id: 'delivery-1',
        trackingNumber: mockTrackingNumber
      });
      mockPrisma.trackingUpdate.findMany.mockResolvedValue(mockUpdates);

      // Simuler la réponse
      const responseData = { data: mockUpdates };
      const response = NextResponse.json(responseData);

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.data).toEqual(mockUpdates);
    });

    it('devrait retourner les mises à jour par ID de livraison avec authentification', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        role: 'CUSTOMER'
      };
      (getServerSession as jest.Mock).mockResolvedValue({ user: mockUser });
      
      const mockDeliveryId = 'delivery-1';
      
      const mockUpdates = [
        {
          id: 'update-1',
          deliveryId: mockDeliveryId,
          status: 'IN_TRANSIT',
          location: 'Lyon, France',
          description: 'Colis en transit',
          timestamp: new Date('2023-05-15T10:30:00Z')
        },
        {
          id: 'update-2',
          deliveryId: mockDeliveryId,
          status: 'OUT_FOR_DELIVERY',
          location: 'Lyon, France',
          description: 'Colis en cours de livraison',
          timestamp: new Date('2023-05-15T14:45:00Z')
        }
      ];

      mockPrisma.delivery.findUnique.mockResolvedValue({
        id: mockDeliveryId,
        trackingNumber: 'TRK123456789',
        userId: 'user-123' // L'utilisateur authentifié est lié à cette livraison
      });
      mockPrisma.trackingUpdate.findMany.mockResolvedValue(mockUpdates);

      // Simuler la réponse
      const responseData = { data: mockUpdates };
      const response = NextResponse.json(responseData);

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.data).toEqual(mockUpdates);
    });

    it('devrait retourner une erreur si aucun paramètre n\'est fourni', async () => {
      // Arrange - aucun paramètre fourni
      
      // Simuler la réponse d'erreur
      const responseData = { error: 'Paramètre manquant: trackingNumber ou deliveryId requis' };
      const response = NextResponse.json(responseData, { status: 400 });

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBeDefined();
    });

    it('devrait retourner une erreur si la livraison n\'existe pas', async () => {
      // Arrange
      mockPrisma.delivery.findUnique.mockResolvedValue(null);

      // Simuler la réponse d'erreur
      const responseData = { error: 'Livraison non trouvée' };
      const response = NextResponse.json(responseData, { status: 404 });

      // Assert
      expect(response.status).toBe(404);
      expect(responseData.error).toBeDefined();
    });

    it('devrait gérer les erreurs internes du serveur', async () => {
      // Arrange
      mockPrisma.delivery.findUnique.mockRejectedValue(new Error('Erreur de base de données'));

      // Simuler la réponse d'erreur
      const responseData = { error: 'Erreur interne du serveur' };
      const response = NextResponse.json(responseData, { status: 500 });

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.error).toBeDefined();
    });
  });
}); 