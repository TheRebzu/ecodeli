import { PrismaClient } from "@prisma/client";

async function checkTutorialIssue() {
  const prisma = new PrismaClient();
  
  try {
    console.log("🔍 Diagnostic du problème de tutoriel en boucle\n");
    
    // 1. Vérifier l'utilisateur de test client
    const testUser = await prisma.user.findUnique({
      where: { email: "jean.dupont@orange.fr" },
      include: {
        client: true
      }
    });
    
    if (!testUser) {
      console.error("❌ Utilisateur de test non trouvé");
      return;
    }
    
    console.log("✅ Utilisateur trouvé:", {
      id: testUser.id,
      email: testUser.email,
      role: testUser.role,
      isVerified: testUser.isVerified,
      status: testUser.status
    });
    
    if (testUser.client) {
      console.log("\n📊 État du tutoriel:", {
        tutorialMission1Completed: testUser.client.tutorialMission1Completed,
        tutorialMission1Progress: testUser.client.tutorialMission1Progress,
        tutorialMission1CompletedAt: testUser.client.tutorialMission1CompletedAt
      });
    }
    
    // 2. Réinitialiser le tutoriel pour tester
    console.log("\n🔧 Réinitialisation du tutoriel pour les tests...");
    
    if (testUser.client) {
      await prisma.client.update({
        where: { id: testUser.client.id },
        data: {
          tutorialMission1Completed: false,
          tutorialMission1Progress: 0,
          tutorialMission1CompletedAt: null
        }
      });
      
      console.log("✅ Tutoriel réinitialisé avec succès");
    }
    
    // 3. Vérifier d'autres utilisateurs clients
    console.log("\n📋 Vérification des autres clients:");
    
    const allClients = await prisma.client.findMany({
      include: {
        user: {
          select: {
            email: true,
            status: true
          }
        }
      }
    });
    
    allClients.forEach(client => {
      console.log(`- ${client.user.email}: Mission1=${client.tutorialMission1Completed}, Progress=${client.tutorialMission1Progress}`);
    });
    
  } catch (error) {
    console.error("❌ Erreur:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTutorialIssue();