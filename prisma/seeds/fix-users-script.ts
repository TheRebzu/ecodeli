import { PrismaClient, DeliveryStatusEnum } from '@prisma/client';

// Configuration du client Prisma
const prisma = new PrismaClient();

/**
 * Script correctif pour ajouter la colonne currentStatus à tous les utilisateurs
 * et résoudre le problème "The column 'colonne' does not exist"
 */
async function main() {
  console.log('🔧 Démarrage du script correctif pour la table users...');

  try {
    // Vérification de la connexion à la base de données
    try {
      await prisma.$executeRaw`SELECT 1`;
      console.log('✅ Connexion à la base de données réussie');
    } catch (error) {
      console.error('❌ Erreur de connexion à la base de données:', error);
      process.exit(1);
    }
    
    // Vérifier si la colonne currentStatus existe déjà
    try {
      // On crée une requête SQL directe pour vérifier si la colonne existe
      const tableInfo = await prisma.$queryRaw`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'currentStatus'
      `;
      
      console.log('Résultat de la vérification de colonne:', tableInfo);
      
      if (Array.isArray(tableInfo) && tableInfo.length === 0) {
        console.log('⚠️ La colonne currentStatus n\'existe pas, tentative d\'ajout...');
        
        // On utilise SQL brut pour ajouter la colonne avec une valeur par défaut
        await prisma.$executeRaw`
          ALTER TABLE users
          ADD COLUMN IF NOT EXISTS "currentStatus" TEXT NOT NULL DEFAULT 'CREATED'
        `;
        
        console.log('✅ Colonne currentStatus ajoutée avec succès');
      } else {
        console.log('✅ La colonne currentStatus existe déjà');
      }
      
      // Vérifier si d'autres colonnes requises existent, sinon les ajouter
      await prisma.$executeRaw`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS "lastUpdated" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "trackingEnabled" BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS "estimatedArrival" TIMESTAMP(3) NULL,
        ADD COLUMN IF NOT EXISTS "actualArrival" TIMESTAMP(3) NULL,
        ADD COLUMN IF NOT EXISTS "proofOfDelivery" TEXT NULL,
        ADD COLUMN IF NOT EXISTS "deliveryCode" TEXT NULL
      `;
      
      console.log('✅ Toutes les colonnes requises ont été vérifiées et ajoutées si nécessaire');
      
    } catch (error) {
      console.error('❌ Erreur lors de la vérification ou ajout des colonnes:', error);
      throw error;
    }

    console.log('🎉 Script correctif terminé avec succès!');
  } catch (error) {
    console.error('❌ Erreur pendant l\'exécution du script:', error);
    throw error;
  } finally {
    // Fermeture de la connexion Prisma
    await prisma.$disconnect();
  }
}

// Exécution de la fonction principale
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 