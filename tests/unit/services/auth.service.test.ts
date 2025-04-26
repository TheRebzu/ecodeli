import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthService } from "~/server/services/auth.service";
import { PrismaClient, UserRole, UserStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { hash } from "bcryptjs";

// Mock du client Prisma
vi.mock("~/server/db", () => {
  const mockUser = {
    id: "user1",
    email: "test@example.com",
    name: "Test User",
    password: "", // Sera défini dans le setup
    emailVerified: new Date(),
    role: "CLIENT",
    status: "ACTIVE",
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockVerificationToken = {
    identifier: "test@example.com",
    token: "valid-token",
    expires: new Date(Date.now() + 3600000), // 1 heure dans le futur
  };

  const mockExpiredToken = {
    identifier: "test@example.com",
    token: "expired-token",
    expires: new Date(Date.now() - 3600000), // 1 heure dans le passé
  };

  return {
    default: {
      user: {
        findUnique: vi.fn((args) => {
          if (args.where.email === "test@example.com") {
            return Promise.resolve(mockUser);
          }
          if (args.where.id === "user1") {
            return Promise.resolve(mockUser);
          }
          return Promise.resolve(null);
        }),
        create: vi.fn(() => Promise.resolve({ ...mockUser, id: "new-user" })),
        update: vi.fn((args) => Promise.resolve({ ...mockUser, ...args.data })),
      },
      client: {
        create: vi.fn(() => Promise.resolve({ id: "client1", userId: "new-user" })),
      },
      deliverer: {
        create: vi.fn(() => Promise.resolve({ id: "deliverer1", userId: "new-user" })),
      },
      merchant: {
        create: vi.fn(() => Promise.resolve({ id: "merchant1", userId: "new-user" })),
      },
      provider: {
        create: vi.fn(() => Promise.resolve({ id: "provider1", userId: "new-user" })),
      },
      verificationToken: {
        create: vi.fn(() => Promise.resolve(mockVerificationToken)),
        findUnique: vi.fn((args) => {
          if (args.where.token === "valid-token") {
            return Promise.resolve(mockVerificationToken);
          }
          if (args.where.token === "expired-token") {
            return Promise.resolve(mockExpiredToken);
          }
          return Promise.resolve(null);
        }),
        delete: vi.fn(() => Promise.resolve()),
      },
      $transaction: vi.fn((callback) => callback({
        user: { create: vi.fn(() => Promise.resolve(mockUser)) },
        client: { create: vi.fn(() => Promise.resolve({ id: "client1" })) },
        deliverer: { create: vi.fn(() => Promise.resolve({ id: "deliverer1" })) },
        merchant: { create: vi.fn(() => Promise.resolve({ id: "merchant1" })) },
        provider: { create: vi.fn(() => Promise.resolve({ id: "provider1" })) },
        verificationToken: { create: vi.fn(() => Promise.resolve(mockVerificationToken)) },
      })),
    },
  };
});

// Mock des fonctions d'envoi d'emails
vi.mock("~/emails/auth-emails", () => ({
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

describe("AuthService", () => {
  let authService: AuthService;
  let mockPrisma: any;

  beforeEach(async () => {
    vi.resetAllMocks();
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      client: {
        create: vi.fn(),
      },
      deliverer: {
        create: vi.fn(),
      },
      merchant: {
        create: vi.fn(),
      },
      provider: {
        create: vi.fn(),
      },
      verificationToken: {
        create: vi.fn(),
        findUnique: vi.fn(),
        delete: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(mockPrisma)),
    };
    
    authService = new AuthService(mockPrisma as unknown as PrismaClient);

    // Créer un hash de mot de passe pour les tests
    const hashedPassword = await hash("Password123", 12);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user1",
      email: "test@example.com",
      password: hashedPassword,
      name: "Test User",
      role: UserRole.CLIENT,
      status: UserStatus.ACTIVE,
      emailVerified: new Date(),
    });
  });

  describe("userExists", () => {
    it("devrait retourner true si l'utilisateur existe", async () => {
      const result = await authService.userExists("test@example.com");
      expect(result).toBe(true);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
    });

    it("devrait retourner false si l'utilisateur n'existe pas", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await authService.userExists("nonexistent@example.com");
      expect(result).toBe(false);
    });
  });

  describe("registerClient", () => {
    it("devrait créer un nouvel utilisateur client", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const clientData = {
        email: "new@example.com",
        password: "Password123",
        name: "New User",
        address: "123 Main St",
        phone: "123-456-7890",
      };

      const result = await authService.registerClient(clientData);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("devrait échouer si l'email existe déjà", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "existing-user" });
      const clientData = {
        email: "existing@example.com",
        password: "Password123",
        name: "Existing User",
      };

      await expect(authService.registerClient(clientData)).rejects.toThrow(TRPCError);
    });
  });

  describe("verifyEmail", () => {
    it("devrait vérifier l'email avec un token valide", async () => {
      mockPrisma.verificationToken.findUnique.mockResolvedValue({
        identifier: "test@example.com",
        token: "valid-token",
        expires: new Date(Date.now() + 3600000),
      });

      const result = await authService.verifyEmail("valid-token");

      expect(result).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalled();
      expect(mockPrisma.verificationToken.delete).toHaveBeenCalled();
    });

    it("devrait échouer avec un token expiré", async () => {
      mockPrisma.verificationToken.findUnique.mockResolvedValue({
        identifier: "test@example.com",
        token: "expired-token",
        expires: new Date(Date.now() - 3600000),
      });

      await expect(authService.verifyEmail("expired-token")).rejects.toThrow(TRPCError);
    });

    it("devrait échouer avec un token invalide", async () => {
      mockPrisma.verificationToken.findUnique.mockResolvedValue(null);

      await expect(authService.verifyEmail("invalid-token")).rejects.toThrow(TRPCError);
    });
  });

  describe("forgotPassword", () => {
    it("devrait créer un token de réinitialisation pour un email existant", async () => {
      const result = await authService.forgotPassword("test@example.com");

      expect(result).toBe(true);
      expect(mockPrisma.verificationToken.create).toHaveBeenCalled();
    });

    it("devrait retourner true même si l'email n'existe pas (sécurité)", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await authService.forgotPassword("nonexistent@example.com");

      expect(result).toBe(true);
      // Ne devrait pas créer de token
      expect(mockPrisma.verificationToken.create).not.toHaveBeenCalled();
    });
  });

  describe("resetPassword", () => {
    it("devrait réinitialiser le mot de passe avec un token valide", async () => {
      mockPrisma.verificationToken.findUnique.mockResolvedValue({
        identifier: "test@example.com",
        token: "valid-token",
        expires: new Date(Date.now() + 3600000),
      });

      const result = await authService.resetPassword("valid-token", "NewPassword123");

      expect(result).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalled();
      expect(mockPrisma.verificationToken.delete).toHaveBeenCalled();
    });

    it("devrait échouer avec un token expiré", async () => {
      mockPrisma.verificationToken.findUnique.mockResolvedValue({
        identifier: "test@example.com",
        token: "expired-token",
        expires: new Date(Date.now() - 3600000),
      });

      await expect(authService.resetPassword("expired-token", "NewPassword123")).rejects.toThrow(TRPCError);
    });

    it("devrait échouer avec un token invalide", async () => {
      mockPrisma.verificationToken.findUnique.mockResolvedValue(null);

      await expect(authService.resetPassword("invalid-token", "NewPassword123")).rejects.toThrow(TRPCError);
    });
  });
});