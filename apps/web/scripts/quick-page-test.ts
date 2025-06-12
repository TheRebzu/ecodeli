#!/usr/bin/env tsx

import { exec } from 'child_process';
import { promisify } from 'util';
import { createHash } from 'crypto';
import { PrismaClient, UserRole } from '@prisma/client';

const execAsync = promisify(exec);

interface QuickTestUser {
  email: string;
  role: UserRole;
  sessionToken: string;
}

/**
 * Script rapide pour tester une page spécifique avec curl
 * Utilisation: tsx scripts/quick-page-test.ts /fr/admin/users
 */
async function quickPageTest() {
  const targetRoute = process.argv[2];

  if (!targetRoute) {
    console.log('❌ Erreur: Veuillez spécifier une route à tester');
    console.log('   Utilisation: tsx scripts/quick-page-test.ts /fr/admin/users');
    process.exit(1);
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const jwtSecret = process.env.NEXTAUTH_SECRET || 'fallback-secret';
  const prisma = new PrismaClient();

  try {
    console.log(`🧪 TEST RAPIDE POUR: ${targetRoute}`);
    console.log('====================================');

    // Récupérer quelques utilisateurs de test
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: 'admin' } },
          { email: { contains: 'client' } },
          { email: { contains: 'deliverer' } },
          { email: { contains: 'merchant' } },
          { email: { contains: 'provider' } },
        ],
      },
      select: {
        email: true,
        role: true,
      },
      take: 5,
    });

    // Générer les tokens de session
    const testUsers: QuickTestUser[] = users.map(user => {
      const payload = `${user.email}-${Date.now()}`;
      const sessionToken = createHash('sha256')
        .update(payload + jwtSecret)
        .digest('hex');
      return {
        email: user.email,
        role: user.role,
        sessionToken,
      };
    });

    console.log(`\n🔐 Utilisateurs de test trouvés: ${testUsers.length}`);
    testUsers.forEach(user => {
      console.log(`   - ${user.role}: ${user.email}`);
    });

    // Test sans authentification
    console.log('\n📝 Test sans authentification:');
    console.log('================================');
    const fullUrl = `${baseUrl}${targetRoute}`;
    const noAuthCommand = `curl -s -w "Status: %{http_code}\\nTime: %{time_total}s\\n" -o /dev/null "${fullUrl}"`;

    console.log(`Commande: ${noAuthCommand}`);
    try {
      const { stdout } = await execAsync(noAuthCommand);
      console.log(stdout);
    } catch (error) {
      console.log(`❌ Erreur: ${error}`);
    }

    // Test avec chaque utilisateur
    console.log('\n🔐 Tests avec authentification:');
    console.log('===============================');

    for (const user of testUsers) {
      console.log(`\n👤 Test avec ${user.role} (${user.email}):`);
      const cookies = `next-auth.session-token=${user.sessionToken}; next-auth.csrf-token=csrf-token-value`;
      const authCommand = `curl -s -w "Status: %{http_code}\\nTime: %{time_total}s\\n" -o /dev/null -H "Cookie: ${cookies}" "${fullUrl}"`;

      console.log(`Commande: curl -H "Cookie: [SESSION]" "${fullUrl}"`);
      try {
        const { stdout } = await execAsync(authCommand);
        console.log(stdout);
      } catch (error) {
        console.log(`❌ Erreur: ${error}`);
      }
    }

    // Afficher les commandes pour copier-coller
    console.log('\n🔧 COMMANDES CURL COMPLÈTES:');
    console.log('============================');

    console.log('\n📝 Sans authentification:');
    console.log(`curl -v "${fullUrl}"`);

    console.log('\n🔐 Avec authentification:');
    testUsers.forEach(user => {
      const cookies = `next-auth.session-token=${user.sessionToken}; next-auth.csrf-token=csrf-token-value`;
      console.log(`\n# Test avec ${user.role} (${user.email}):`);
      console.log(`curl -v -H "Cookie: ${cookies}" "${fullUrl}"`);
    });

    console.log('\n💡 CODES DE STATUT COURANTS:');
    console.log('============================');
    console.log('200 - OK (page chargée avec succès)');
    console.log('301/302 - Redirection');
    console.log('401 - Non autorisé (pas authentifié)');
    console.log('403 - Interdit (mauvais rôle)');
    console.log('404 - Page non trouvée');
    console.log('500 - Erreur serveur');

    console.log('\n✅ Test terminé');
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécution
quickPageTest();
