/**
 * Script d'information sur l'extraction de session pour les administrateurs
 * Usage: node scripts/auth/extract-admin-info.cjs
 */

console.log("📋 INFORMATIONS D'EXTRACTION DE SESSION ADMIN");
console.log("================================================");

console.log("\n🔧 1. SCRIPT D'EXTRACTION EXISTANT :");
console.log(
  "   Chemin: /mnt/c/Users/Amine/WebstormProjects/ecodeli/scripts/auth/extract-client-session.cjs",
);
console.log("   ✅ Modifié pour supporter les utilisateurs ADMIN");
console.log("   ✅ Gère automatiquement les différents mots de passe admin");

console.log("\n👤 2. UTILISATEURS ADMIN DISPONIBLES DANS LES SEEDS :");
const adminUsers = [
  {
    email: "jp.dubois@ecodeli.me",
    name: "Jean-Pierre Dubois",
    department: "Direction Générale",
    role: "Super Admin",
    password: "SuperAdmin2024!",
    status: "ACTIVE",
  },
  {
    email: "mc.rousseau@ecodeli.me",
    name: "Marie-Claire Rousseau",
    department: "Direction Technique",
    role: "Super Admin",
    password: "SuperAdmin2024!",
    status: "ACTIVE",
  },
  {
    email: "sophie.admin@ecodeli.me",
    name: "Sophie Admin",
    department: "Administration Générale",
    role: "Admin Support",
    password: "AdminPass2024!",
    status: "ACTIVE",
  },
  {
    email: "t.moreau@ecodeli.me",
    name: "Thomas Moreau",
    department: "Vérifications",
    role: "Admin Vérifications",
    password: "SupportAdmin2024!",
    status: "ACTIVE",
  },
  {
    email: "l.durand@ecodeli.me",
    name: "Laurent Durand",
    department: "Direction Financière",
    role: "Admin Financier",
    password: "FinanceAdmin2024!",
    status: "ACTIVE",
  },
  {
    email: "i.blanc@ecodeli.me",
    name: "Isabelle Blanc",
    department: "Comptabilité",
    role: "Admin Comptabilité",
    password: "FinanceAdmin2024!",
    status: "ACTIVE",
  },
];

adminUsers.forEach((user, index) => {
  console.log(`   ${index + 1}. ${user.name} (${user.email})`);
  console.log(`      📧 Email: ${user.email}`);
  console.log(`      🏢 Département: ${user.department}`);
  console.log(`      🔐 Mot de passe: ${user.password}`);
  console.log(`      📊 Statut: ${user.status}`);
  console.log("");
});

console.log(
  "\n⚠️  IMPORTANT : L'utilisateur jean.dupont@orange.fr est un CLIENT, pas un ADMIN",
);

console.log(
  "\n🚀 3. MÉTHODES RECOMMANDÉES POUR EXTRAIRE LES COOKIES DE SESSION :",
);

console.log("\n   A) Avec le script d'extraction (recommandé) :");
console.log("      # Pour le super admin principal :");
console.log(
  "      node scripts/auth/extract-client-session.cjs jp.dubois@ecodeli.me",
);
console.log("");
console.log("      # Pour l'admin support :");
console.log(
  "      node scripts/auth/extract-client-session.cjs sophie.admin@ecodeli.me",
);
console.log("");
console.log(
  "      # Le script génère automatiquement un fichier avec les cookies",
);

console.log("\n   B) Via le script admin dédié :");
console.log("      # Utilise le premier admin par défaut :");
console.log("      node scripts/auth/extract-admin-session.cjs");
console.log("");
console.log("      # Ou spécifier un admin :");
console.log(
  "      node scripts/auth/extract-admin-session.cjs jp.dubois@ecodeli.me",
);

console.log(
  "\n   C) Configuration manuelle (si les scripts ne fonctionnent pas) :",
);
console.log("      1. Lancer l'application : pnpm dev");
console.log("      2. Se connecter via l'interface web avec :");
console.log("         - Email: jp.dubois@ecodeli.me");
console.log("         - Mot de passe: SuperAdmin2024!");
console.log("      3. Copier les cookies depuis les DevTools du navigateur");
console.log("      4. Utiliser : next-auth.session-token=VALUE_FROM_BROWSER");

console.log("\n🔧 4. PRÉREQUIS POUR LES SCRIPTS :");
console.log("   ✅ Base de données configurée");
console.log("   ✅ Seeds exécutés (pnpm run seed:users ou pnpm run seed)");
console.log("   ✅ Client Prisma généré (npx prisma generate)");
console.log("   ✅ Variables d'environnement configurées (.env)");

console.log("\n📋 5. EXEMPLE D'UTILISATION CURL AVEC LES COOKIES :");
console.log(`
# Vérification de l'accès admin
curl -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \\
     http://localhost:3000/fr/admin

# API tRPC pour les statistiques admin
curl -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \\
     -H "Content-Type: application/json" \\
     http://localhost:3000/api/trpc/admin.stats.getPlatformStats

# Gestion des utilisateurs
curl -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \\
     http://localhost:3000/fr/admin/users

# Vérifications en attente
curl -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \\
     http://localhost:3000/fr/admin/verifications
`);

console.log("\n✅ RÉSUMÉ :");
console.log(
  "   📁 Script existant : scripts/auth/extract-client-session.cjs (modifié pour admin)",
);
console.log(
  "   📁 Script admin dédié : scripts/auth/extract-admin-session.cjs",
);
console.log("   👤 Email admin principal : jp.dubois@ecodeli.me");
console.log("   🔐 Mot de passe : SuperAdmin2024!");
console.log(
  "   🎯 Recommandation : Utiliser le script d'extraction automatique",
);
