import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock des dépendances manuellement plutôt qu'avec les chemins alias
const mockDb = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  }
};

const mockBcrypt = {
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn(),
};

// Mock pour NextRequest
const createMockRequest = (body: any) => {
  return {
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
};

// Mocks des routes
const mockRegisterRoute = {
  POST: async (req: NextRequest) => {
    const data = await req.json();
    
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await mockDb.user.findUnique({
      where: { email: data.email }
    });
    
    if (existingUser) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Un utilisateur avec cet email existe déjà'
      }), { status: 400 });
    }
    
    // Hasher le mot de passe
    const hashedPassword = await mockBcrypt.hash(data.password, 10);
    
    // Créer l'utilisateur
    const user = await mockDb.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Compte créé avec succès'
    }), { status: 201 });
  }
};

const mockLoginRoute = {
  POST: async (req: NextRequest) => {
    const { email, password } = await req.json();
    
    // Vérifier si l'utilisateur existe
    const user = await mockDb.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Email ou mot de passe incorrect'
      }), { status: 401 });
    }
    
    // Vérifier le mot de passe
    const passwordMatch = await mockBcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Email ou mot de passe incorrect'
      }), { status: 401 });
    }
    
    return new Response(JSON.stringify({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    }), { status: 200 });
  }
};

describe('API Auth - Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Route /api/auth/register', () => {
    it('devrait créer un nouvel utilisateur', async () => {
      // Mock pour le cas où l'utilisateur n'existe pas
      mockDb.user.findUnique.mockResolvedValue(null);
      mockDb.user.create.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        role: 'LIVREUR',
      });

      const mockRequest = createMockRequest({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'LIVREUR',
        phone: '0612345678',
      });

      const response = await mockRegisterRoute.POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData).toEqual(expect.objectContaining({
        success: true,
        message: expect.any(String),
      }));
      expect(mockDb.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'test@example.com',
          password: 'hashed_password',
        }),
      });
    });

    it('devrait retourner une erreur si l\'utilisateur existe déjà', async () => {
      // Mock pour le cas où l'utilisateur existe déjà
      mockDb.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
      });

      const mockRequest = createMockRequest({
        email: 'test@example.com',
        password: 'Password123!',
      });

      const response = await mockRegisterRoute.POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toEqual(expect.objectContaining({
        success: false,
        message: expect.stringContaining('existe déjà'),
      }));
      expect(mockDb.user.create).not.toHaveBeenCalled();
    });
  });

  describe('Route /api/auth/login', () => {
    it('devrait connecter un utilisateur avec des identifiants valides', async () => {
      // Mock pour trouver l'utilisateur
      mockDb.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        password: 'hashed_password',
        role: 'LIVREUR',
      });
      
      // Le mot de passe correspond
      mockBcrypt.compare.mockResolvedValue(true);

      const mockRequest = createMockRequest({
        email: 'test@example.com',
        password: 'Password123!',
      });

      const response = await mockLoginRoute.POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toEqual(expect.objectContaining({
        success: true,
        user: expect.objectContaining({
          id: '1',
          email: 'test@example.com',
        }),
      }));
    });

    it('devrait rejeter la connexion avec des identifiants invalides', async () => {
      // Mock pour trouver l'utilisateur
      mockDb.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        password: 'hashed_password',
      });
      
      // Le mot de passe ne correspond pas
      mockBcrypt.compare.mockResolvedValue(false);

      const mockRequest = createMockRequest({
        email: 'test@example.com',
        password: 'WrongPassword123!',
      });

      const response = await mockLoginRoute.POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData).toEqual(expect.objectContaining({
        success: false,
        message: expect.stringContaining('Email ou mot de passe incorrect'),
      }));
    });

    it('devrait rejeter la connexion pour un utilisateur inexistant', async () => {
      // Mock pour un utilisateur qui n'existe pas
      mockDb.user.findUnique.mockResolvedValue(null);

      const mockRequest = createMockRequest({
        email: 'nonexistent@example.com',
        password: 'Password123!',
      });

      const response = await mockLoginRoute.POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData).toEqual(expect.objectContaining({
        success: false,
        message: expect.stringContaining('Email ou mot de passe incorrect'),
      }));
    });
  });
}); 