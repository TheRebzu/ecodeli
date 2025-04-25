import {getRequestConfig} from 'next-intl/server';
import { routing } from './routing';
import fs from 'fs/promises';
import path from 'path';

// Helper function to load all translation files from a locale directory
async function loadAllTranslations(locale: string) {
  const localesDir = path.join(process.cwd(), 'src', 'locales', locale);
  try {
    const files = await fs.readdir(localesDir);
    const translations: Record<string, any> = {};
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(localesDir, file), 'utf8');
        const namespace = file.replace('.json', '');
        translations[namespace] = JSON.parse(content);
      }
    }
    
    // Also load common.json from public/locales if it exists
    try {
      const commonPath = path.join(process.cwd(), 'public', 'locales', locale, 'common.json');
      const commonContent = await fs.readFile(commonPath, 'utf8');
      translations['common'] = JSON.parse(commonContent);
    } catch (e) {
      // Ignore if common.json doesn't exist in public/locales
    }
    
    return translations;
  } catch (e) {
    console.error(`Error loading translations for locale ${locale}:`, e);
    return {};
  }
}

export default getRequestConfig(async ({locale}) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locale || !routing.locales.includes(locale as "fr")) {
    locale = 'fr' as const; // Default to 'fr' if locale is missing or invalid
  }
  
  // Load all translations from src/locales and public/locales
  const messages = await loadAllTranslations(locale);
  
  return {
    messages,
    locale // Return the locale
  };
}); 