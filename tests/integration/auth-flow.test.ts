import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { AppRouter } from '@/server/api/root';
import { createInnerTRPCContext } from '@/server/api/trpc';
import { appRouter } from '@/server/api/root';
import { db } from '@/server/db';

// Tests qui vérifient l'intégration des différentes parties du système d'authentification

describe("Flux d'authentification", () => {
  // Setup pour les tests d'intégration
  let client: ReturnType<typeof createTRPCProxyClient<AppRouter>>;

  beforeAll(() => {
    // Configurez une base de données de test ou un mock pour les tests d'intégration
    client = createTRPCProxyClient<AppRouter>({
      links: [
        httpBatchLink({
          url: 'http://localhost:3000/api/trpc',
        }),
      ],
    });
  });

  afterAll(async () => {
    // Nettoyage des ressources après les tests
    await db.$disconnect();
  });

  beforeEach(async () => {
    // Préparation avant chaque test
    await db.user.deleteMany({
      where: {
        email: {
          contains: 'test',
        },
      },
    });

    await db.verificationToken.deleteMany({
      where: {
        identifier: {
          contains: 'test',
        },
      },
    });
  });

  it('devrait pouvoir enregistrer un utilisateur et vérifier son email', async () => {
    // 1. Enregistrer un utilisateur
    const registerResult = await client.auth.registerClient.mutate({
      name: 'Test Client',
      email: 'test.client@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      address: '123 Test St',
      phone: '1234567890',
      city: 'Test City',
      postalCode: '12345',
    });

    expect(registerResult.user).toBeDefined();
    expect(registerResult.user.email).toBe('test.client@example.com');
    expect(registerResult.verificationToken).toBeDefined();

    // 2. Utiliser le token pour vérifier l'email
    const verifyResult = await client.auth.verifyEmail.mutate({
      token: registerResult.verificationToken,
    });

    expect(verifyResult.success).toBe(true);
    expect(verifyResult.user.emailVerified).not.toBeNull();
    expect(verifyResult.user.status).toBe('ACTIVE');

    // 3. Essayer de se connecter
    const loginResult = await client.auth.login.mutate({
      email: 'test.client@example.com',
      password: 'Password123!',
    });

    expect(loginResult.success).toBe(true);
    expect(loginResult.user.email).toBe('test.client@example.com');
  });

  it('devrait pouvoir réinitialiser le mot de passe', async () => {
    // 1. Créer un utilisateur
    await client.auth.registerClient.mutate({
      name: 'Reset Password User',
      email: 'test.reset@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      address: '123 Test St',
      phone: '1234567890',
      city: 'Test City',
      postalCode: '12345',
    });

    // 2. Demander une réinitialisation de mot de passe
    const forgotResult = await client.auth.forgotPassword.mutate({
      email: 'test.reset@example.com',
    });

    expect(forgotResult.success).toBe(true);

    // 3. Récupérer le token depuis la base de données (pour les tests)
    const resetToken = await db.verificationToken.findFirst({
      where: {
        identifier: 'test.reset@example.com',
        type: 'PASSWORD_RESET',
      },
    });

    expect(resetToken).not.toBeNull();

    // 4. Réinitialiser le mot de passe
    const resetResult = await client.auth.resetPassword.mutate({
      token: resetToken!.token,
      password: 'NewPassword123!',
    });

    expect(resetResult.success).toBe(true);

    // 5. Se connecter avec le nouveau mot de passe
    const loginResult = await client.auth.login.mutate({
      email: 'test.reset@example.com',
      password: 'NewPassword123!',
    });

    expect(loginResult.success).toBe(true);
  });
});
