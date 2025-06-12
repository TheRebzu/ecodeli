const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

/**
 * Script d'extraction de session pour le client de test Jean Dupont
 * Usage: node scripts/auth/extract-client-session.js
 */
async function extractClientSession() {
  try {
    console.log('🔍 Recherche du compte client Jean Dupont...');

    // Vérification que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: {
        email: 'jean.dupont@orange.fr',
      },
      include: {
        profile: true,
        ClientProfile: true,
      },
    });

    if (!user) {
      console.log('❌ Utilisateur Jean Dupont non trouvé');
      console.log('💡 Exécutez le seeding: pnpm run seed:users');
      process.exit(1);
    }

    console.log(`✅ Utilisateur trouvé: ${user.name} (${user.email})`);
    console.log(`🔐 Rôle: ${user.role}, Statut: ${user.status}`);
    console.log(`📧 Email vérifié: ${user.isVerified}`);

    // Vérification du mot de passe par défaut
    const isValidPassword = await bcrypt.compare('password123', user.password);
    if (!isValidPassword) {
      console.log('❌ Mot de passe incorrect pour le compte de test');
      process.exit(1);
    }

    console.log('✅ Authentification réussie');

    // Génération du token JWT (si l'app utilise JWT)
    const jwtSecret = process.env.NEXTAUTH_SECRET || 'your-secret-key';
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24h
      },
      jwtSecret
    );

    // Génération du cookie de session NextAuth
    const sessionToken = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      jwtSecret
    );

    // Données de session
    const sessionData = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        isVerified: user.isVerified,
        image: user.image,
      },
      tokens: {
        access_token: token,
        session_token: sessionToken,
      },
      cookies: {
        'next-auth.session-token': sessionToken,
        'next-auth.csrf-token': 'csrf-token-value',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    // Sauvegarde dans un fichier
    const outputPath = path.join(process.cwd(), 'cookies_jean_dupont_session.txt');
    const curlCookies = `next-auth.session-token=${sessionToken}; next-auth.csrf-token=csrf-token-value`;

    const output = `# Session pour Jean Dupont (Client)
# Généré le: ${new Date().toISOString()}
# Expire le: ${sessionData.expires}

# Cookies pour curl
COOKIES="${curlCookies}"

# Token JWT
ACCESS_TOKEN="${token}"

# Exemples d'utilisation curl:

# Vérification du profil client
curl -H "Cookie: \$COOKIES" \\
     -H "Content-Type: application/json" \\
     http://localhost:3000/api/trpc/user.profile

# Page dashboard client
curl -H "Cookie: \$COOKIES" \\
     http://localhost:3000/fr/client

# API tRPC - Services
curl -H "Cookie: \$COOKIES" \\
     -H "Content-Type: application/json" \\
     http://localhost:3000/api/trpc/services.getAll

# API tRPC - Annonces du client
curl -H "Cookie: \$COOKIES" \\
     -H "Content-Type: application/json" \\
     http://localhost:3000/api/trpc/announcements.getMyAnnouncements

# Test avec Authorization header (si l'API supporte JWT)
curl -H "Authorization: Bearer \$ACCESS_TOKEN" \\
     -H "Content-Type: application/json" \\
     http://localhost:3000/api/trpc/user.profile

# Données utilisateur complètes:
# ${JSON.stringify(sessionData, null, 2)}
`;

    fs.writeFileSync(outputPath, output);

    console.log('\n🎉 Session extraite avec succès!');
    console.log(`📁 Fichier sauvegardé: ${outputPath}`);
    console.log('\n📋 Cookies pour curl:');
    console.log(`"${curlCookies}"`);
    console.log('\n🔑 Token JWT:');
    console.log(token);

    return sessionData;
  } catch (error) {
    console.error("❌ Erreur lors de l'extraction de session:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécution si appelé directement
if (require.main === module) {
  extractClientSession();
}

module.exports = { extractClientSession };
