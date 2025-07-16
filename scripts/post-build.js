#!/usr/bin/env node
/**
 * Script post-build pour Vercel
 * Exécute le seeding de la base de données après le build
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function runPostBuild() {
  console.log('🚀 Running post-build script...');
  
  // Vérifier si on est en environnement Docker
  const isDocker = fs.existsSync('/.dockerenv');
  
  if (isDocker) {
    console.log('🐳 Running in Docker environment, skipping post-build seeding');
    console.log('ℹ️  Docker containers use docker-init.sh for database initialization');
    return;
  }
  
  // Vérifier si on est en environnement Vercel
  const isVercel = process.env.VERCEL === '1';
  const vercelEnv = process.env.VERCEL_ENV; // 'production', 'preview', 'development'
  
  if (!isVercel) {
    console.log('⚠️  Not running on Vercel, skipping seeding');
    return;
  }
  
  console.log('📦 Environment:', process.env.NODE_ENV);
  console.log('🌐 Vercel Environment:', vercelEnv);
  
  // Vérifier si la base de données est configurée
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  DATABASE_URL not found, skipping seeding');
    return;
  }
  
  // Appliquer le seeding pour tous les environnements (production, preview, development)
  try {
    // Générer le client Prisma
    console.log('🔄 Generating Prisma client...');
    execSync('pnpm run prisma:generate', { stdio: 'inherit' });
    
    // Pousser le schéma vers la base de données
    console.log('🔄 Pushing database schema...');
    execSync('npx prisma db push --force-reset', { stdio: 'inherit' });
    
    // Exécuter le seeding
    console.log('🌱 Running database seed...');
    execSync('pnpm run db:seed', { stdio: 'inherit' });
    
    console.log('✅ Post-build completed successfully!');
    console.log('📝 Database seeded with test data');
    
  } catch (error) {
    console.error('❌ Error during post-build:', error.message);
    
    // En cas d'erreur, créer un fichier de log
    const logPath = path.join(process.cwd(), 'post-build-error.log');
    fs.writeFileSync(logPath, `Post-build error: ${error.message}\n${error.stack}`);
    
    // Ne pas faire échouer le build pour les erreurs de seeding
    console.log('⚠️  Continuing build despite seeding error...');
  }
}

runPostBuild().catch(console.error);