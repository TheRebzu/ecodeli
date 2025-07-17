const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPassword(email, password) {
  try {
    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        isActive: true
      }
    });
    
    if (!user) {
      console.log('❌ Utilisateur non trouvé:', email);
      return;
    }
    
    console.log('👤 Utilisateur trouvé:', {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      hasPassword: !!user.password
    });
    
    if (!user.password) {
      console.log('⚠️  Aucun mot de passe défini pour cet utilisateur');
      return;
    }
    
    // Vérifier le mot de passe
    const isValid = await bcrypt.compare(password, user.password);
    console.log('🔐 Mot de passe valide?', isValid);
    
    if (isValid) {
      console.log('✅ Connexion possible avec ce mot de passe');
    } else {
      console.log('❌ Mot de passe incorrect');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Utilisation
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.log('Usage: node check-password.js <email> <mot_de_passe>');
  console.log('Exemple: node check-password.js celian@celian-vf.fr Test123!');
  process.exit(1);
}

checkPassword(email, password); 