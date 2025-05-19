// prisma/migrate.js - Script pour appliquer manuellement les migrations

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script pour ajouter les champs de vérification et de réinitialisation à la table User
 */
async function main() {
  try {
    console.log('🔄 Application des migrations manuelles...');

    // Vérifier si la colonne verificationToken existe déjà
    const hasVerificationToken = await checkIfColumnExists('users', 'verificationToken');

    if (!hasVerificationToken) {
      console.log('➕ Ajout des colonnes de vérification et réinitialisation...');

      // Ajouter les colonnes manquantes
      await prisma.$executeRaw`
        ALTER TABLE "users" 
        ADD COLUMN IF NOT EXISTS "verificationToken" TEXT,
        ADD COLUMN IF NOT EXISTS "verificationTokenExpires" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "resetToken" TEXT,
        ADD COLUMN IF NOT EXISTS "resetTokenExpires" TIMESTAMP(3)
      `;

      console.log('✅ Colonnes ajoutées avec succès!');
    } else {
      console.log('ℹ️ Les colonnes existent déjà.');
    }

    console.log('✅ Migrations terminées avec succès!');
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Vérifie si une colonne existe dans une table
 */
async function checkIfColumnExists(tableName, columnName) {
  try {
    const result = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = ${tableName}
        AND column_name = ${columnName}
      );
    `;

    return result[0].exists;
  } catch (error) {
    console.error(`Erreur lors de la vérification de la colonne ${columnName}:`, error);
    return false;
  }
}

main();
