import { useState, useEffect } from 'react';

/**
 * Hook personnalisé pour éviter les erreurs d'hydratation
 * Conforme aux standards EcoDeli Mission 1
 * 
 * @returns {boolean} État de montage du composant
 */
export function useMounted(): boolean {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return isMounted;
}

/**
 * Hook avec callback pour exécuter du code uniquement côté client
 * Utile pour sessionStorage, localStorage, document, window
 * 
 * @param callback Fonction à exécuter après montage
 * @returns État de montage
 */
export function useMountedCallback(callback: () => void): boolean {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      callback();
    }
  }, [callback]);

  return isMounted;
}

/**
 * Hook pour storage sécurisé (évite les erreurs d'hydratation)
 * 
 * @param key Clé de stockage
 * @param defaultValue Valeur par défaut
 * @param storage Type de storage ('session' | 'local')
 * @returns [value, setValue, isMounted]
 */
export function useSafeStorage<T>(
  key: string, 
  defaultValue: T, 
  storage: 'session' | 'local' = 'session'
): [T, (value: T) => void, boolean] {
  const [isMounted, setIsMounted] = useState(false);
  const [storedValue, setStoredValue] = useState<T>(defaultValue);

  useEffect(() => {
    setIsMounted(true);
    
    try {
      const storageObj = storage === 'session' ? sessionStorage : localStorage;
      const item = storageObj.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.warn(`Erreur lors de la lecture du ${storage}Storage:`, error);
    }
  }, [key, storage]);

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      if (isMounted) {
        const storageObj = storage === 'session' ? sessionStorage : localStorage;
        storageObj.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.warn(`Erreur lors de l'écriture du ${storage}Storage:`, error);
    }
  };

  return [storedValue, setValue, isMounted];
}

/**
 * Hook pour conditionnels côté client uniquement
 * Évite les erreurs typeof window !== 'undefined'
 * 
 * @param clientValue Valeur côté client
 * @param serverValue Valeur côté serveur
 * @returns Valeur appropriée selon l'environnement
 */
export function useClientValue<T>(clientValue: T, serverValue: T): T {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return isMounted ? clientValue : serverValue;
} 