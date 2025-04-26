import '@testing-library/jest-dom/extend-expect';

// Automatiquement importer la bibliothèque d'assertions jest-dom
import './jest-dom.d.ts';

// Supprimer les avertissements de la console lors des tests
const originalConsoleError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' && 
    (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
     args[0].includes('Warning: React.createFactory is deprecated') ||
     args[0].includes('Warning: Using UNSAFE_'))
  ) {
    return;
  }
  originalConsoleError(...args);
}; 