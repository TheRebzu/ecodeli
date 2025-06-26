const fs = require('fs')
const path = require('path')

/**
 * Configuration de l'environnement EcoDeli
 */
async function setupEnvironment() {
  console.log('🚀 Configuration de l\'environnement EcoDeli...\n')

  const envPath = path.join(process.cwd(), '.env')
  const envExamplePath = path.join(process.cwd(), 'env.example')

  // Vérifier si .env existe déjà
  if (fs.existsSync(envPath)) {
    console.log('✅ Fichier .env existe déjà')
    console.log('   Chemin:', envPath)
    return
  }

  // Vérifier si env.example existe
  if (!fs.existsSync(envExamplePath)) {
    console.error('❌ Fichier env.example non trouvé')
    console.log('   Création d\'un fichier .env de base...')
    
    // Créer un fichier .env de base
    const baseEnvContent = `# ========================================
# ECODELI - VARIABLES D'ENVIRONNEMENT
# ========================================

# ========================================
# ENVIRONNEMENT
# ========================================
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-change-in-production

# ========================================
# BASE DE DONNÉES
# ========================================
DATABASE_URL="postgresql://username:password@localhost:5432/ecodeli"

# ========================================
# AUTHENTIFICATION
# ========================================
JWT_SECRET=your-jwt-secret-key-change-in-production
ADMIN_SECRET_KEY=admin-secret-key-change-in-production
ADMIN_REGISTRATION_KEY=admin-registration-key-change-in-production

# ========================================
# EMAIL SMTP
# ========================================
SMTP_HOST=mail.celian-vf.fr
SMTP_PORT=587
SMTP_SECURE=false
GMAIL_USER=your-email@celian-vf.fr
GMAIL_APP_PASSWORD=your-app-password

# ========================================
# APPLICATION
# ========================================
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# ========================================
# UPLOAD ET STOCKAGE
# ========================================
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# ========================================
# MONITORING ET LOGS
# ========================================
LOG_LEVEL=info
`

    fs.writeFileSync(envPath, baseEnvContent)
    console.log('✅ Fichier .env créé avec la configuration de base')
    console.log('   Chemin:', envPath)
    console.log('\n⚠️  IMPORTANT: Modifiez le fichier .env avec vos vraies valeurs')
    console.log('   - DATABASE_URL: URL de votre base de données PostgreSQL')
    console.log('   - GMAIL_USER: Votre email SMTP')
    console.log('   - GMAIL_APP_PASSWORD: Mot de passe d\'application SMTP')
    console.log('   - NEXTAUTH_SECRET: Clé secrète pour l\'authentification')
    console.log('   - JWT_SECRET: Clé secrète pour les JWT')
    
  } else {
    // Copier env.example vers .env
    const envExampleContent = fs.readFileSync(envExamplePath, 'utf8')
    fs.writeFileSync(envPath, envExampleContent)
    console.log('✅ Fichier .env créé à partir de env.example')
    console.log('   Chemin:', envPath)
  }

  console.log('\n📋 Prochaines étapes:')
  console.log('   1. Modifiez le fichier .env avec vos vraies valeurs')
  console.log('   2. Testez la configuration SMTP: node scripts/test-smtp.js')
  console.log('   3. Initialisez les paramètres: node scripts/init-settings.js')
  console.log('   4. Démarrez l\'application: npm run dev')
}

// Exécuter la configuration
setupEnvironment() 