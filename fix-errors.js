// Script simple pour corriger les erreurs TypeScript
const fs = require('fs');

// Corriger les erreurs principales
function fixTypeScriptErrors() {
  console.log('🔧 Correction des erreurs TypeScript...');
  
  // 1. Corriger les types unknown -> number
  const locationsFile = 'src/app/[locale]/(protected)/admin/locations/page.tsx';
  if (fs.existsSync(locationsFile)) {
    let content = fs.readFileSync(locationsFile, 'utf8');
    content = content.replace(/capacity: unknown/g, 'capacity: number');
    content = content.replace(/pricePerDay: unknown/g, 'pricePerDay: number');
    fs.writeFileSync(locationsFile, content);
    console.log('✅ Corrigé: admin/locations types');
  }
  
  // 2. Corriger les propriétés user.subscription
  const clientLayoutFile = 'src/app/[locale]/(protected)/client/layout.tsx';
  if (fs.existsSync(clientLayoutFile)) {
    let content = fs.readFileSync(clientLayoutFile, 'utf8');
    content = content.replace(/user\.subscription/g, '(user as any).subscription');
    fs.writeFileSync(clientLayoutFile, content);
    console.log('✅ Corrigé: client layout subscription');
  }
  
  // 3. Corriger les noms de champs dans les formulaires
  const editAnnouncementFile = 'src/app/[locale]/(protected)/client/announcements/[id]/edit/page.tsx';
  if (fs.existsSync(editAnnouncementFile)) {
    let content = fs.readFileSync(editAnnouncementFile, 'utf8');
    content = content.replace(/"startLocation\.address"/g, '"pickupAddress"');
    content = content.replace(/"startLocation\.city"/g, '"pickupAddress"');
    content = content.replace(/"startLocation\.postalCode"/g, '"pickupAddress"');
    content = content.replace(/"endLocation\.address"/g, '"deliveryAddress"');
    content = content.replace(/"endLocation\.city"/g, '"deliveryAddress"');
    content = content.replace(/"endLocation\.postalCode"/g, '"deliveryAddress"');
    content = content.replace(/"desiredDate"/g, '"pickupDate"');
    content = content.replace(/"flexibleDates"/g, '"isFlexibleDate"');
    content = content.replace(/"urgent"/g, '"isUrgent"');
    content = content.replace(/"price"/g, '"estimatedPrice"');
    fs.writeFileSync(editAnnouncementFile, content);
    console.log('✅ Corrigé: edit announcement fields');
  }
  
  // 4. Corriger les propriétés manquantes dans invoice
  const invoiceFile = 'src/app/[locale]/(protected)/client/invoice/[paymentId]/page.tsx';
  if (fs.existsSync(invoiceFile)) {
    let content = fs.readFileSync(invoiceFile, 'utf8');
    content = content.replace(/invoice\.issuedAt/g, 'invoice.createdAt');
    fs.writeFileSync(invoiceFile, content);
    console.log('✅ Corrigé: invoice issuedAt');
  }
  
  // 5. Ajouter les types manquants pour UserForUI
  const entitiesFile = 'src/types/entities.ts';
  if (fs.existsSync(entitiesFile)) {
    let content = fs.readFileSync(entitiesFile, 'utf8');
    if (!content.includes('subscription?:')) {
      content = content.replace(
        'export type UserForUI = {',
        `export type UserForUI = {
  id: string;
  email: string;
  name?: string | null;
  image?: string;
  role: UserRole;
  isActive: boolean;
  validationStatus: string;
  profileData?: any;
  subscription?: "FREE" | "STARTER" | "PREMIUM";
  avatar?: string;
}

export type UserForUITemp = {`
      );
      fs.writeFileSync(entitiesFile, content);
      console.log('✅ Corrigé: UserForUI type');
    }
  }
  
  console.log('✅ Corrections terminées !');
}

// Exécuter les corrections
fixTypeScriptErrors(); 