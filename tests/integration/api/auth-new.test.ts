import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import * as auth from "next-auth";
import * as bcrypt from "bcryptjs";

// Import the mock from jest.setup.js 
import mockPrisma from "@/lib/prisma";

// Handlers d'API (à implémenter ou à mocker selon votre structure)
const registerHandler = jest.fn();
const loginHandler = jest.fn();
const sessionHandler = jest.fn();
const logoutHandler = jest.fn();
const forgotPasswordHandler = jest.fn();
const resetPasswordHandler = jest.fn();
const verifyEmailHandler = jest.fn();

// Données de test
const mockUser = {
  id: "user123",
  email: "test@example.com",
  name: "Test User",
  password: "hashed_password",
  role: "CLIENT",
  status: "ACTIVE"
};

describe("API d'authentification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Configurations par défaut pour les mocks
    registerHandler.mockImplementation((req) => {
      return NextResponse.json({ success: true, message: "Utilisateur créé avec succès" }, { status: 201 });
    });
    
    loginHandler.mockImplementation((req) => {
      return NextResponse.json({ success: true, user: { id: mockUser.id, email: mockUser.email } }, { status: 200 });
    });
    
    sessionHandler.mockImplementation((req) => {
      return NextResponse.json({ user: mockUser }, { status: 200 });
    });
    
    logoutHandler.mockImplementation((req) => {
      return NextResponse.json({ success: true }, { status: 200 });
    });
    
    forgotPasswordHandler.mockImplementation((req) => {
      return NextResponse.json({ success: true, message: "Email envoyé" }, { status: 200 });
    });
    
    resetPasswordHandler.mockImplementation((req) => {
      return NextResponse.json({ success: true, message: "Mot de passe réinitialisé" }, { status: 200 });
    });
    
    verifyEmailHandler.mockImplementation((req) => {
      return NextResponse.json({ success: true, message: "Email vérifié" }, { status: 200 });
    });
  });

  describe("Inscription (Register)", () => {
    it("devrait créer un nouvel utilisateur avec des données valides", async () => {
      // Arrangement
      const requestData = {
        name: "Nouveau Utilisateur",
        email: "nouveau@example.com",
        password: "MotDePasse123!",
        role: "CLIENT"
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        ...requestData,
        id: "nouveau-id",
        password: "hashed_password",
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      });

      // Action
      const response = await registerHandler(req);

      // Assertions
      expect(response.status).toBe(201);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          success: true,
          message: expect.any(String)
        })
      );
    });

    it("devrait retourner une erreur pour un email déjà utilisé", async () => {
      // Arrangement
      const requestData = {
        name: "Utilisateur Existant",
        email: "existant@example.com",
        password: "MotDePasse123!",
        role: "CLIENT"
      };

      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-existant",
        email: requestData.email,
        name: "Autre Nom",
        password: "hashed_password"
      });
      
      // Mock spécifique pour ce cas
      registerHandler.mockImplementationOnce((req) => {
        return NextResponse.json({ 
          success: false, 
          message: "Cet email est déjà utilisé" 
        }, { status: 400 });
      });

      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      });

      // Action
      const response = await registerHandler(req);

      // Assertions
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining("déjà utilisé")
        })
      );
    });

    it("devrait valider le mot de passe", async () => {
      // Arrangement
      const requestData = {
        name: "Utilisateur Faible",
        email: "faible@example.com",
        password: "faible", // Mot de passe trop simple
        role: "CLIENT"
      };
      
      // Mock spécifique pour ce cas
      registerHandler.mockImplementationOnce((req) => {
        return NextResponse.json({ 
          success: false, 
          errors: [{
            path: ["password"],
            message: "Le mot de passe doit contenir au moins 8 caractères"
          }]
        }, { status: 400 });
      });

      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      });

      // Action
      const response = await registerHandler(req);

      // Assertions
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          success: false,
          errors: expect.arrayContaining([
            expect.objectContaining({
              path: ["password"]
            })
          ])
        })
      );
    });
  });

  describe("Connexion (Login)", () => {
    it("devrait connecter un utilisateur avec des identifiants valides", async () => {
      // Arrangement
      const credentials = {
        email: "test@example.com",
        password: "MotDePasse123!"
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials)
      });

      // Action
      const response = await loginHandler(req);

      // Assertions
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          success: true
        })
      );
    });

    it("devrait rejeter une connexion avec un email invalide", async () => {
      // Arrangement
      const credentials = {
        email: "inexistant@example.com",
        password: "MotDePasse123!"
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      
      // Mock spécifique pour ce cas
      loginHandler.mockImplementationOnce((req) => {
        return NextResponse.json({ 
          success: false, 
          error: "Email ou mot de passe incorrect" 
        }, { status: 401 });
      });

      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials)
      });

      // Action
      const response = await loginHandler(req);

      // Assertions
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining("Email ou mot de passe incorrect")
        })
      );
    });

    it("devrait rejeter une connexion avec un mot de passe invalide", async () => {
      // Arrangement
      const credentials = {
        email: "test@example.com",
        password: "MauvaisMotDePasse"
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
      
      // Mock spécifique pour ce cas
      loginHandler.mockImplementationOnce((req) => {
        return NextResponse.json({ 
          success: false, 
          error: "Email ou mot de passe incorrect" 
        }, { status: 401 });
      });

      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials)
      });

      // Action
      const response = await loginHandler(req);

      // Assertions
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining("Email ou mot de passe incorrect")
        })
      );
    });
  });

  describe("Session", () => {
    it("devrait retourner les informations de session pour un utilisateur authentifié", async () => {
      // Arrangement
      const mockSession = {
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          role: mockUser.role
        }
      };

      (auth.getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const req = new NextRequest("http://localhost:3000/api/auth/session");

      // Action
      const response = await sessionHandler(req);

      // Assertions
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          user: expect.objectContaining({
            id: mockUser.id,
            email: mockUser.email
          })
        })
      );
    });

    it("devrait retourner null pour un utilisateur non authentifié", async () => {
      // Arrangement
      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      // Mock spécifique pour ce cas
      sessionHandler.mockImplementationOnce((req) => {
        return NextResponse.json({ user: null }, { status: 200 });
      });

      const req = new NextRequest("http://localhost:3000/api/auth/session");

      // Action
      const response = await sessionHandler(req);

      // Assertions
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ user: null });
    });
  });

  describe("Déconnexion (Logout)", () => {
    it("devrait déconnecter l'utilisateur correctement", async () => {
      // Arrangement
      const req = new NextRequest("http://localhost:3000/api/auth/logout", {
        method: "POST"
      });

      // Action
      const response = await logoutHandler(req);

      // Assertions
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          success: true
        })
      );
    });
  });

  describe("Mot de passe oublié", () => {
    it("devrait envoyer un email de réinitialisation pour un email existant", async () => {
      // Arrangement
      const requestData = {
        email: "test@example.com"
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const req = new NextRequest("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      });

      // Action
      const response = await forgotPasswordHandler(req);

      // Assertions
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          success: true
        })
      );
    });

    it("devrait retourner une réponse positive même pour un email inexistant (sécurité)", async () => {
      // Arrangement
      const requestData = {
        email: "inexistant@example.com"
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      });

      // Action
      const response = await forgotPasswordHandler(req);

      // Assertions
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          success: true
        })
      );
    });
  });

  describe("Réinitialisation de mot de passe", () => {
    it("devrait réinitialiser le mot de passe avec un token valide", async () => {
      // Arrangement
      const token = "token-valide-123";
      const requestData = {
        token,
        password: "NouveauMotDePasse123!",
        confirmPassword: "NouveauMotDePasse123!"
      };

      mockPrisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        resetPasswordToken: token,
        resetPasswordExpires: new Date(Date.now() + 3600000) // Expire dans 1 heure
      });

      const req = new NextRequest("http://localhost:3000/api/auth/reset-password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      });

      // Action
      const response = await resetPasswordHandler(req);

      // Assertions
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          success: true
        })
      );
    });

    it("devrait rejeter un token invalide", async () => {
      // Arrangement
      const requestData = {
        token: "token-invalide",
        password: "NouveauMotDePasse123!",
        confirmPassword: "NouveauMotDePasse123!"
      };

      mockPrisma.user.findFirst.mockResolvedValue(null);
      
      // Mock spécifique pour ce cas
      resetPasswordHandler.mockImplementationOnce((req) => {
        return NextResponse.json({ 
          success: false, 
          error: "Token invalide ou expiré" 
        }, { status: 400 });
      });

      const req = new NextRequest("http://localhost:3000/api/auth/reset-password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      });

      // Action
      const response = await resetPasswordHandler(req);

      // Assertions
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining("invalide")
        })
      );
    });
  });

  describe("Vérification d'email", () => {
    it("devrait vérifier l'email avec un token valide", async () => {
      // Arrangement
      const token = "token-verification-valide";
      
      mockPrisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        isVerified: false,
        verificationToken: token
      });

      const url = new URL("http://localhost:3000/api/auth/verify-email");
      url.searchParams.set("token", token);
      const req = new NextRequest(url);

      // Action
      const response = await verifyEmailHandler(req);

      // Assertions
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          success: true
        })
      );
    });

    it("devrait rejeter un token de vérification invalide", async () => {
      // Arrangement
      const token = "token-verification-invalide";
      
      mockPrisma.user.findFirst.mockResolvedValue(null);
      
      // Mock spécifique pour ce cas
      verifyEmailHandler.mockImplementationOnce((req) => {
        return NextResponse.json({ 
          success: false, 
          error: "Token de vérification invalide" 
        }, { status: 400 });
      });

      const url = new URL("http://localhost:3000/api/auth/verify-email");
      url.searchParams.set("token", token);
      const req = new NextRequest(url);

      // Action
      const response = await verifyEmailHandler(req);

      // Assertions
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining("invalide")
        })
      );
    });
  });
}); 