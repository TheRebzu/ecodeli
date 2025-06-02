import { createContext, useContext, useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [locale, setLocale] = useState('fr');
  const pathname = usePathname();
  const router = useRouter();
  
  // Détecter la langue à partir de l'URL
  useEffect(() => {
    const pathLocale = pathname.split('/')[1];
    if (pathLocale && ['fr', 'en', 'es'].includes(pathLocale)) {
      setLocale(pathLocale);
    }
  }, [pathname]);
  
  const changeLanguage = (newLocale) => {
    if (newLocale === locale) return;
    
    // Construire la nouvelle URL avec la nouvelle langue
    const segments = pathname.split('/');
    segments[1] = newLocale;
    const newPath = segments.join('/');
    
    // Rediriger vers la nouvelle URL
    router.push(newPath);
  };
  
  const value = {
    locale,
    changeLanguage,
  };
  
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  
  return context;
}