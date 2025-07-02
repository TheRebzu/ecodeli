// Script pour vérifier le statut des documents dans la base de données
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDocumentsStatus() {
  try {
    console.log('Checking documents status in database...\n');
    
    // Récupérer tous les documents avec leurs utilisateurs
    const documents = await prisma.document.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            validationStatus: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`Found ${documents.length} documents total\n`);
    
    // Grouper par utilisateur
    const documentsByUser = {};
    documents.forEach(doc => {
      const userId = doc.userId;
      if (!documentsByUser[userId]) {
        documentsByUser[userId] = {
          user: doc.user,
          documents: []
        };
      }
      documentsByUser[userId].documents.push(doc);
    });
    
    // Afficher les résultats
    Object.values(documentsByUser).forEach((userData) => {
      console.log(`User: ${userData.user.email} (${userData.user.role})`);
      console.log(`User validation status: ${userData.user.validationStatus}`);
      console.log('Documents:');
      
      userData.documents.forEach((doc) => {
        console.log(`  - ${doc.type}: ${doc.validationStatus} (${doc.validatedAt ? 'validated' : 'not validated'})`);
      });
      
      console.log('');
    });
    
    // Vérifier spécifiquement les livreurs
    console.log('=== DELIVERERS DOCUMENTS ===');
    const deliverers = Object.values(documentsByUser).filter((userData) => userData.user.role === 'DELIVERER');
    
    deliverers.forEach((userData) => {
      console.log(`\nDeliverer: ${userData.user.email}`);
      console.log(`Validation status: ${userData.user.validationStatus}`);
      
      userData.documents.forEach((doc) => {
        console.log(`  - ${doc.type}: ${doc.validationStatus}`);
      });
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDocumentsStatus(); 