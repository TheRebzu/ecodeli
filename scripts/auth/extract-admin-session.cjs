const { extractClientSession } = require("./extract-client-session.cjs");

/**
 * Script d'extraction de session pour les administrateurs
 * Usage: node scripts/auth/extract-admin-session.js [email]
 *
 * Administrateurs disponibles dans les seeds:
 * - jp.dubois@ecodeli.fr (Super Admin - Direction Générale)
 * - mc.rousseau@ecodeli.fr (Super Admin - Direction Technique)
 * - sophie.admin@ecodeli.fr (Admin Support)
 * - t.moreau@ecodeli.fr (Admin Vérifications)
 * - l.durand@ecodeli.fr (Admin Financier)
 * - i.blanc@ecodeli.fr (Admin Comptabilité)
 */

async function extractAdminSession() {
  // Emails d'administrateurs disponibles dans les seeds
  const adminEmails = [
    "jp.dubois@ecodeli.fr", // Super Admin - Direction Générale
    "mc.rousseau@ecodeli.fr", // Super Admin - Direction Technique
    "sophie.admin@ecodeli.fr", // Admin Support
    "t.moreau@ecodeli.fr", // Admin Vérifications
    "l.durand@ecodeli.fr", // Admin Financier
    "i.blanc@ecodeli.fr", // Admin Comptabilité
  ];

  // Obtenir l'email depuis les arguments ou utiliser le premier par défaut
  const targetEmail = process.argv[2] || adminEmails[0];

  if (!adminEmails.includes(targetEmail)) {
    console.log("⚠️  Email admin non reconnu. Emails disponibles:");
    adminEmails.forEach((email) => console.log(`   - ${email}`));
    console.log(
      "\n💡 Usage: node scripts/auth/extract-admin-session.js [email]",
    );
    process.exit(1);
  }

  console.log(`🔧 Extraction de session admin pour: ${targetEmail}`);

  // Utiliser la fonction existante
  await extractClientSession(targetEmail);
}

// Exécution si appelé directement
if (require.main === module) {
  extractAdminSession();
}

module.exports = { extractAdminSession };
