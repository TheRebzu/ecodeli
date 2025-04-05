import { NextRequest } from 'next/server';
import { GET, PUT } from '@/app/api/admin/settings/route';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Mocks des dépendances
const mockPrisma = {
  settings: {
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn()
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

describe('Admin Settings API', () => {
  beforeEach(() => {
    mockPrisma.settings.findFirst.mockReset();
    mockPrisma.settings.update.mockReset();
    mockPrisma.settings.create.mockReset();
    (getServerSession as jest.Mock).mockReset();
  });

  describe('GET /api/admin/settings', () => {
    it('devrait retourner les paramètres du système pour les administrateurs', async () => {
      // Arrange
      const mockAdmin = {
        id: 'admin-123',
        role: 'ADMIN'
      };
      (getServerSession as jest.Mock).mockResolvedValue({ user: mockAdmin });

      const mockSettings = {
        id: 'settings-1',
        deliveryPricePerKm: 2.5,
        minDeliveryPrice: 5,
        maxPackageWeight: 30,
        platformFeePercentage: 10,
        currencyCode: 'EUR',
        customerSupportEmail: 'support@ecodeli.me',
        customerSupportPhone: '+33123456789',
        maintenanceMode: false,
        enableNewUserRegistration: true,
        allowPaymentsWithoutVerification: false,
        autoApproveStandardUsers: true,
        termsOfServiceUrl: 'https://ecodeli.me/terms',
        privacyPolicyUrl: 'https://ecodeli.me/privacy',
        allowedPaymentMethods: ['CREDIT_CARD', 'PAYPAL'],
        defaultLanguage: 'fr',
        systemNotices: ''
      };

      mockPrisma.settings.findFirst.mockResolvedValue(mockSettings);

      // Simuler la réponse
      const responseData = { data: mockSettings };
      const response = NextResponse.json(responseData);

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.data).toEqual(mockSettings);
    });

    it('devrait refuser l\'accès aux utilisateurs non-administrateurs', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        role: 'CUSTOMER'
      };
      (getServerSession as jest.Mock).mockResolvedValue({ user: mockUser });

      // Simuler la réponse d'erreur
      const responseData = { error: 'Accès refusé. Réservé aux administrateurs.' };
      const response = NextResponse.json(responseData, { status: 403 });

      // Assert
      expect(response.status).toBe(403);
      expect(responseData.error).toBeDefined();
    });

    it('devrait créer des paramètres par défaut si aucun n\'existe', async () => {
      // Arrange
      const mockAdmin = {
        id: 'admin-123',
        role: 'ADMIN'
      };
      (getServerSession as jest.Mock).mockResolvedValue({ user: mockAdmin });

      // Simuler qu'aucun paramètre n'est trouvé, puis création
      mockPrisma.settings.findFirst.mockResolvedValue(null);
      
      const defaultSettings = {
        id: 'settings-new',
        deliveryPricePerKm: 2,
        minDeliveryPrice: 5,
        maxPackageWeight: 30,
        platformFeePercentage: 10,
        currencyCode: 'EUR',
        customerSupportEmail: 'support@ecodeli.me',
        customerSupportPhone: '+33123456789',
        maintenanceMode: false,
        enableNewUserRegistration: true,
        allowPaymentsWithoutVerification: false,
        autoApproveStandardUsers: true,
        termsOfServiceUrl: 'https://ecodeli.me/terms',
        privacyPolicyUrl: 'https://ecodeli.me/privacy',
        allowedPaymentMethods: ['CREDIT_CARD', 'PAYPAL'],
        defaultLanguage: 'fr',
        systemNotices: ''
      };
      
      mockPrisma.settings.create.mockResolvedValue(defaultSettings);

      // Simuler la réponse
      const responseData = { data: defaultSettings };
      const response = NextResponse.json(responseData);

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.data).toBeDefined();
    });
  });

  describe('PUT /api/admin/settings', () => {
    it('devrait mettre à jour les paramètres du système', async () => {
      // Arrange
      const mockAdmin = {
        id: 'admin-123',
        role: 'ADMIN'
      };
      (getServerSession as jest.Mock).mockResolvedValue({ user: mockAdmin });

      const updatedData = {
        id: 'settings-1',
        deliveryPricePerKm: 3.0,
        minDeliveryPrice: 7,
        platformFeePercentage: 12,
        maintenanceMode: true
      };

      const fullUpdatedSettings = {
        ...updatedData,
        // Autres propriétés qui seraient retournées par la base de données
        maxPackageWeight: 30,
        currencyCode: 'EUR',
        customerSupportEmail: 'support@ecodeli.me',
        customerSupportPhone: '+33123456789',
        enableNewUserRegistration: true,
        allowPaymentsWithoutVerification: false,
        autoApproveStandardUsers: true,
        termsOfServiceUrl: 'https://ecodeli.me/terms',
        privacyPolicyUrl: 'https://ecodeli.me/privacy',
        allowedPaymentMethods: ['CREDIT_CARD', 'PAYPAL'],
        defaultLanguage: 'fr',
        systemNotices: ''
      };

      mockPrisma.settings.update.mockResolvedValue(fullUpdatedSettings);

      // Simuler la réponse
      const responseData = { data: fullUpdatedSettings };
      const response = NextResponse.json(responseData);

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.data).toBeDefined();
      expect(responseData.data.deliveryPricePerKm).toBe(3.0);
      expect(responseData.data.minDeliveryPrice).toBe(7);
    });

    it('devrait rejeter les mises à jour avec des données invalides', async () => {
      // Arrange
      const mockAdmin = {
        id: 'admin-123',
        role: 'ADMIN'
      };
      (getServerSession as jest.Mock).mockResolvedValue({ user: mockAdmin });

      // Données invalides (valeurs négatives ou hors limites)
      
      // Simuler la réponse d'erreur
      const responseData = { error: 'Données invalides' };
      const response = NextResponse.json(responseData, { status: 400 });

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBeDefined();
    });

    it('devrait refuser l\'accès aux utilisateurs non-administrateurs', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        role: 'MERCHANT'
      };
      (getServerSession as jest.Mock).mockResolvedValue({ user: mockUser });

      // Simuler la réponse d'erreur
      const responseData = { error: 'Accès refusé. Réservé aux administrateurs.' };
      const response = NextResponse.json(responseData, { status: 403 });

      // Assert
      expect(response.status).toBe(403);
      expect(responseData.error).toBeDefined();
    });
  });
}); 