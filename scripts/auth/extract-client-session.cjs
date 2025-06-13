const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

/**
 * Script d'extraction de session pour le client de test Jean Dupont
 * Usage: node scripts/auth/extract-client-session.js [email]
 */
async function extractClientSession(targetEmail = "jean.dupont@orange.fr") {
  try {
    console.log(`🔍 Recherche du compte utilisateur ${targetEmail}...`);

    // Vérification que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: {
        email: targetEmail,
      },
      include: {
        profile: true,
        ClientProfile: true,
        admin: true,
      },
    });

    if (!user) {
      console.log(`❌ Utilisateur ${targetEmail} non trouvé`);
      console.log("💡 Exécutez le seeding: pnpm run seed:users");
      process.exit(1);
    }

    console.log(`✅ Utilisateur trouvé: ${user.name} (${user.email})`);
    console.log(`🔐 Rôle: ${user.role}, Statut: ${user.status}`);
    console.log(`📧 Email vérifié: ${user.isVerified}`);

    // Vérification du mot de passe par défaut selon le rôle
    let password = "password123"; // Défaut pour CLIENT
    if (user.role === "ADMIN") {
      // Essayer différents mots de passe admin selon les seeds
      const adminPasswords = [
        "SuperAdmin2024!",
        "AdminPass2024!",
        "SupportAdmin2024!",
        "FinanceAdmin2024!",
      ];
      let isValidPassword = false;

      for (const testPassword of adminPasswords) {
        if (await bcrypt.compare(testPassword, user.password)) {
          password = testPassword;
          isValidPassword = true;
          break;
        }
      }

      if (!isValidPassword) {
        console.log("❌ Aucun mot de passe admin standard ne fonctionne");
        process.exit(1);
      }
    } else {
      const isValidPassword = await bcrypt.compare(
        "password123",
        user.password,
      );
      if (!isValidPassword) {
        console.log("❌ Mot de passe incorrect pour le compte de test");
        process.exit(1);
      }
    }

    console.log("✅ Authentification réussie");

    // Génération du token JWT (si l'app utilise JWT)
    const jwtSecret = process.env.NEXTAUTH_SECRET || "your-secret-key";
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24h
      },
      jwtSecret,
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
      jwtSecret,
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
        "next-auth.session-token": sessionToken,
        "next-auth.csrf-token": "csrf-token-value",
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    // Sauvegarde dans un fichier
    const sanitizedEmail = targetEmail.replace(/[@.]/g, "_");
    const outputPath = path.join(
      process.cwd(),
      `cookies_${sanitizedEmail}_session.txt`,
    );
    const curlCookies = `next-auth.session-token=${sessionToken}; next-auth.csrf-token=csrf-token-value`;

    // Générer les exemples curl selon le rôle
    let curlExamples = "";
    if (user.role === "ADMIN") {
      curlExamples = `
# Exemples d'utilisation curl pour ADMIN:

# Page dashboard admin
curl -H "Cookie: \\$COOKIES" \\
     http://localhost:3000/fr/admin

# API tRPC - Liste des utilisateurs
curl -H "Cookie: \\$COOKIES" \\
     -H "Content-Type: application/json" \\
     http://localhost:3000/api/trpc/admin.users.getAll

# API tRPC - Statistiques admin
curl -H "Cookie: \\$COOKIES" \\
     -H "Content-Type: application/json" \\
     http://localhost:3000/api/trpc/admin.stats.getPlatformStats

# API tRPC - Gestion des vérifications
curl -H "Cookie: \\$COOKIES" \\
     -H "Content-Type: application/json" \\
     http://localhost:3000/api/trpc/admin.verifications.getPending

# Page de gestion des utilisateurs
curl -H "Cookie: \\$COOKIES" \\
     http://localhost:3000/fr/admin/users

# Page de vérifications
curl -H "Cookie: \\$COOKIES" \\
     http://localhost:3000/fr/admin/verifications
`;
    } else {
      curlExamples = `
# Exemples d'utilisation curl pour CLIENT:

# Page dashboard client
curl -H "Cookie: \\$COOKIES" \\
     http://localhost:3000/fr/client

# API tRPC - Services
curl -H "Cookie: \\$COOKIES" \\
     -H "Content-Type: application/json" \\
     http://localhost:3000/api/trpc/services.getAll

# API tRPC - Annonces du client
curl -H "Cookie: \\$COOKIES" \\
     -H "Content-Type: application/json" \\
     http://localhost:3000/api/trpc/announcements.getMyAnnouncements
`;
    }

    const output = `# Session pour ${user.name} (${user.role})
# Email: ${user.email}
# Généré le: ${new Date().toISOString()}
# Expire le: ${sessionData.expires}

# Cookies pour curl
COOKIES="${curlCookies}"

# Token JWT
ACCESS_TOKEN="${token}"
${curlExamples}
# Vérification du profil utilisateur
curl -H "Cookie: \\$COOKIES" \\
     -H "Content-Type: application/json" \\
     http://localhost:3000/api/trpc/user.profile

# Test avec Authorization header (si l'API supporte JWT)
curl -H "Authorization: Bearer \\$ACCESS_TOKEN" \\
     -H "Content-Type: application/json" \\
     http://localhost:3000/api/trpc/user.profile

# Données utilisateur complètes:
# ${JSON.stringify(sessionData, null, 2)}
`;

    fs.writeFileSync(outputPath, output);

    console.log("\n🎉 Session extraite avec succès!");
    console.log(`📁 Fichier sauvegardé: ${outputPath}`);
    console.log("\n📋 Cookies pour curl:");
    console.log(`"${curlCookies}"`);
    console.log("\n🔑 Token JWT:");
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
  const targetEmail = process.argv[2] || "jean.dupont@orange.fr";
  extractClientSession(targetEmail);
}

module.exports = { extractClientSession };
