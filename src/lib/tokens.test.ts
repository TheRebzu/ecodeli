import { expect, test, vi } from "vitest";
import {
  generateVerificationToken,
  verifyVerificationToken,
  generatePasswordResetToken,
  verifyPasswordResetToken,
} from "@/lib/tokens";
import { PrismaClient } from "@prisma/client";

// Mock de Prisma
vi.mock("@/server/db", () => ({
  db: {
    verificationToken: {
      create: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    passwordResetToken: {
      create: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

test("generateVerificationToken should create a token", async () => {
  const userId = "user123";
  const mockCreate = vi.fn().mockResolvedValue({
    id: "token123",
    token: "verification-token",
    userId,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  const db = {
    verificationToken: {
      create: mockCreate,
    },
  };

  // @ts-ignore - Mock implementation
  const token = await generateVerificationToken(userId, db);

  expect(token).toBeDefined();
  expect(typeof token).toBe("string");
  expect(mockCreate).toHaveBeenCalledWith({
    data: {
      userId,
      expires: expect.any(Date),
    },
  });
});

test("verifyVerificationToken should validate a token", async () => {
  const userId = "user123";
  const token = "valid-token";
  const mockFindFirst = vi.fn().mockResolvedValue({
    id: "token123",
    token,
    userId,
    expires: new Date(Date.now() + 1000), // Not expired
  });

  const mockDelete = vi.fn();

  const db = {
    verificationToken: {
      findFirst: mockFindFirst,
      delete: mockDelete,
    },
  };

  // @ts-ignore - Mock implementation
  const result = await verifyVerificationToken(token, db);

  expect(result).toBe(userId);
  expect(mockFindFirst).toHaveBeenCalledWith({
    where: { token },
  });
  expect(mockDelete).toHaveBeenCalledWith({
    where: { id: "token123" },
  });
});

test("verifyVerificationToken should reject expired token", async () => {
  const token = "expired-token";
  const mockFindFirst = vi.fn().mockResolvedValue({
    id: "token123",
    token,
    userId: "user123",
    expires: new Date(Date.now() - 1000), // Expired
  });

  const mockDelete = vi.fn();

  const db = {
    verificationToken: {
      findFirst: mockFindFirst,
      delete: mockDelete,
    },
  };

  // @ts-ignore - Mock implementation
  const result = await verifyVerificationToken(token, db);

  expect(result).toBeNull();
  expect(mockFindFirst).toHaveBeenCalledWith({
    where: { token },
  });
  expect(mockDelete).toHaveBeenCalledWith({
    where: { id: "token123" },
  });
});

test("verifyVerificationToken should reject invalid token", async () => {
  const token = "invalid-token";
  const mockFindFirst = vi.fn().mockResolvedValue(null);

  const db = {
    verificationToken: {
      findFirst: mockFindFirst,
      delete: vi.fn(),
    },
  };

  // @ts-ignore - Mock implementation
  const result = await verifyVerificationToken(token, db);

  expect(result).toBeNull();
  expect(mockFindFirst).toHaveBeenCalledWith({
    where: { token },
  });
});
