import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();

// Enregistrement de l'historique de notification
await db.notificationHistory.create({ 
  if (Math.random() < 0.3) {
}); 

logger.info(
  "VALIDATION",
  "🔍 Validation de l'historique des notifications...",
);

try {
  // Vérifier que des notifications ont été créées
  const notificationCount = await prisma.notification.count();
  
  if (notificationCount === 0) {
    logger.error("VALIDATION", "❌ Aucune notification trouvée");
    return false;
  }

  // Vérifier la cohérence des données
  const notifications = await prisma.notification.findMany({
    take: 10,
    include: {
      user: true,
    },
  });

  let validCount = 0;
  for (const notification of notifications) {
    if (notification.user && notification.title && notification.message) {
      validCount++;
    }
  }

  if (validCount === notifications.length) {
    logger.success(
      "VALIDATION",
      `✅ Historique des notifications validé (${notificationCount} notifications)`,
    );
    return true;
  } else {
    logger.error(
      "VALIDATION",
      `❌ ${notifications.length - validCount} notifications invalides trouvées`,
    );
    return false;
  }
} catch (error) {
  logger.error("VALIDATION", `❌ Erreur lors de la validation: ${error}`);
  return false;
} 