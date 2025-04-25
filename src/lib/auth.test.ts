import { expect, test } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth";

test("hashPassword should create a valid hash", async () => {
  const password = "TestPassword123!";
  const hash = await hashPassword(password);

  // Le hash doit être une chaîne non vide
  expect(hash).toBeDefined();
  expect(typeof hash).toBe("string");
  expect(hash.length).toBeGreaterThan(0);

  // Le hash ne doit pas être égal au mot de passe original
  expect(hash).not.toBe(password);
});

test("verifyPassword should validate correct password", async () => {
  const password = "TestPassword123!";
  const hash = await hashPassword(password);

  const isValid = await verifyPassword(password, hash);
  expect(isValid).toBe(true);
});

test("verifyPassword should reject incorrect password", async () => {
  const password = "TestPassword123!";
  const wrongPassword = "WrongPassword123!";
  const hash = await hashPassword(password);

  const isValid = await verifyPassword(wrongPassword, hash);
  expect(isValid).toBe(false);
});
