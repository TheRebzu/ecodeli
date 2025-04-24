import {getRequestConfig} from 'next-intl/server';

export default getRequestConfig(async ({locale}) => {
  // Make sure locale is not undefined
  if (!locale) {
    throw new Error('Locale is required but was undefined');
  }
  
  // Check if we're in a production build or development
  let messages = {};
  
  try {
    // Direct dynamic import which works in both dev and production
    messages = (await import(`../public/locales/${locale}/common.json`)).default;
  } catch (error) {
    console.error(`Failed to load locale messages for ${locale}:`, error);
    // Fallback to empty messages object
  }
    
  return {
    messages,
    locale: locale // String is definitely defined now
  };
}); 