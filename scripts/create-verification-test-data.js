const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createVerificationTestData() {
  try {
    console.log('Création de données de test pour les vérifications...');
    
    // Vérifier si les utilisateurs existent déjà
    const existingDeliverer = await prisma.user.findUnique({
      where: { email: 'livreur-test@example.com' }
    });
    
    if (existingDeliverer) {
      console.log('Les données de test existent déjà');
      return;
    }
    
    // Créer un livreur avec documents
    const deliverer = await prisma.user.create({
      data: {
        email: 'livreur-test@example.com',
        password: 'password123',
        role: 'DELIVERER',
        emailVerified: true,
        profile: {
          create: {
            firstName: 'Jean',
            lastName: 'Dupont',
            phone: '+33612345678'
          }
        }
      }
    });
    
    // Ajouter des documents pour le livreur
    await prisma.document.createMany({
      data: [
        {
          userId: deliverer.id,
          type: 'IDENTITY',
          filename: 'identite_livreur.pdf',
          originalName: 'carte_identite.pdf',
          mimeType: 'application/pdf',
          size: 1024000,
          url: '/uploads/documents/identite_livreur.pdf',
          validationStatus: 'PENDING'
        },
        {
          userId: deliverer.id,
          type: 'DRIVING_LICENSE',
          filename: 'permis_livreur.pdf',
          originalName: 'permis_conduire.pdf',
          mimeType: 'application/pdf',
          size: 2048000,
          url: '/uploads/documents/permis_livreur.pdf',
          validationStatus: 'APPROVED'
        },
        {
          userId: deliverer.id,
          type: 'INSURANCE',
          filename: 'assurance_livreur.pdf',
          originalName: 'assurance_vehicule.pdf',
          mimeType: 'application/pdf',
          size: 1536000,
          url: '/uploads/documents/assurance_livreur.pdf',
          validationStatus: 'REJECTED'
        }
      ]
    });
    
    // Créer un prestataire avec documents
    const provider = await prisma.user.create({
      data: {
        email: 'prestataire-test@example.com',
        password: 'password123',
        role: 'PROVIDER',
        emailVerified: true,
        profile: {
          create: {
            firstName: 'Marie',
            lastName: 'Martin',
            phone: '+33687654321'
          }
        }
      }
    });
    
    // Ajouter des documents pour le prestataire
    await prisma.document.createMany({
      data: [
        {
          userId: provider.id,
          type: 'IDENTITY',
          filename: 'identite_prestataire.pdf',
          originalName: 'carte_identite.pdf',
          mimeType: 'application/pdf',
          size: 1024000,
          url: '/uploads/documents/identite_prestataire.pdf',
          validationStatus: 'APPROVED'
        },
        {
          userId: provider.id,
          type: 'CERTIFICATION',
          filename: 'certification.pdf',
          originalName: 'certification_pro.pdf',
          mimeType: 'application/pdf',
          size: 3072000,
          url: '/uploads/documents/certification.pdf',
          validationStatus: 'PENDING'
        }
      ]
    });
    
    // Créer un commerçant avec documents
    const merchant = await prisma.user.create({
      data: {
        email: 'commercant-test@example.com',
        password: 'password123',
        role: 'MERCHANT',
        emailVerified: false, // Email non vérifié pour tester
        profile: {
          create: {
            firstName: 'Pierre',
            lastName: 'Commerce',
            phone: '+33654321987'
          }
        }
      }
    });
    
    // Ajouter des documents pour le commerçant
    await prisma.document.createMany({
      data: [
        {
          userId: merchant.id,
          type: 'IDENTITY',
          filename: 'identite_commercant.pdf',
          originalName: 'carte_identite.pdf',
          mimeType: 'application/pdf',
          size: 1024000,
          url: '/uploads/documents/identite_commercant.pdf',
          validationStatus: 'PENDING'
        },
        {
          userId: merchant.id,
          type: 'CONTRACT',
          filename: 'contrat_commercant.pdf',
          originalName: 'contrat_ecodeli.pdf',
          mimeType: 'application/pdf',
          size: 4096000,
          url: '/uploads/documents/contrat_commercant.pdf',
          validationStatus: 'PENDING'
        }
      ]
    });
    
    console.log('✅ Données de test créées avec succès !');
    console.log('Livreur créé:', deliverer.email);
    console.log('Prestataire créé:', provider.email);
    console.log('Commerçant créé:', merchant.email);
    console.log('');
    console.log('Vous pouvez maintenant accéder à /admin/verifications pour voir les utilisateurs');
    
  } catch (error) {
    console.error('❌ Erreur lors de la création des données:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createVerificationTestData(); 