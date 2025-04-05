'use client';

export function useLanguageManagement() {
  // Hook en cours de développement
  return {
    languages: ['fr', 'en', 'es', 'de'],
    currentLanguage: 'fr',
    setLanguage: (lang: string) => console.log('Set language', lang),
  };
}