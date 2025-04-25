#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Function to ensure consistent directory structure for translations
function ensureTranslationsConsistency() {
  console.log('Ensuring translations consistency...');
  
  const srcLocalesDir = path.join(__dirname, '..', 'src', 'locales');
  const enDir = path.join(srcLocalesDir, 'en');
  const frDir = path.join(srcLocalesDir, 'fr');
  
  // Get all English translation files
  const enFiles = fs.readdirSync(enDir).filter(file => file.endsWith('.json'));
  
  // Check each English file exists in French
  for (const file of enFiles) {
    const frFile = path.join(frDir, file);
    const enFile = path.join(enDir, file);
    
    if (!fs.existsSync(frFile)) {
      console.log(`Creating missing translation file: ${file} in French`);
      // Copy English file to French as a fallback
      fs.copyFileSync(enFile, frFile);
    }
  }
}

// Function to run build and capture errors
function runBuild() {
  try {
    console.log('\n--- Running build ---\n');
    execSync('pnpm run build', { stdio: 'inherit' });
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error.toString() 
    };
  }
}

// Main build loop
async function buildLoop() {
  console.log('Starting build loop...');
  
  let attempt = 1;
  let buildResult = { success: false };
  
  while (!buildResult.success && attempt <= 10) {
    console.log(`\n==== Build Attempt ${attempt} ====\n`);
    
    // Ensure translations are consistent before building
    ensureTranslationsConsistency();
    
    // Run the build
    buildResult = runBuild();
    
    if (buildResult.success) {
      console.log('\n✅ Build succeeded!\n');
      break;
    } else {
      console.log(`\n❌ Build failed on attempt ${attempt}\n`);
      console.log('Fixing issues and trying again...');
      attempt++;
      
      // Wait 2 seconds before trying again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  if (!buildResult.success) {
    console.error('\n❌ Failed to build after multiple attempts. Please check the errors manually.\n');
    process.exit(1);
  }
}

// Start the build loop
buildLoop().catch(err => {
  console.error('Error in build loop:', err);
  process.exit(1);
}); 