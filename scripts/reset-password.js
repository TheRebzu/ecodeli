const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetPassword(email, newPassword) {
  try {
    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Mettre à jour l'utilisateur
    const user = await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true
      }
    });
    
    console.log('✅ Mot de passe mis à jour pour:', user.email);
    console.log('Nouveau mot de passe:', newPassword);
    console.log('Utilisateur:', user);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Utilisation
const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.log('Usage: node reset-password.js <email> <nouveau_mot_de_passe>');
  console.log('Exemple: node reset-password.js celian@celian-vf.fr Test123!');
  process.exit(1);
}

resetPassword(email, newPassword); 