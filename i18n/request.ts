import {getRequestConfig} from 'next-intl/server';

export default getRequestConfig(async ({locale}) => {
  // Make sure locale is not undefined
  if (!locale) {
    throw new Error('Locale is required but was undefined');
  }
  
  // Safe access to locale messages
  const messages = await import(`../../public/locales/${locale}/common.json`)
    .then(module => module.default)
    .catch(() => ({}));
    
  return {
    messages,
    locale: locale // String is definitely defined now
  };
}); 