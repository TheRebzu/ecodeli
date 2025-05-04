export default {
  sourceLang: 'en',
  targetLangs: ['fr'],
  ignorePaths: [
    'node_modules',
    'dist',
    'build',
    '.next',
    'public/static',
    'tests'
  ],
  ignorePatterns: [
    /^[0-9]+$/,           // Nombres uniquement
    /^[A-Z_]+$/,          // Constantes
    /^https?:\/\//,       // URLs
    /^[a-f0-9]{8}-/,      // UUIDs
    /^#[0-9a-f]{3,6}$/i,  // Codes couleur
    /^[\d.]+%$/,          // Pourcentages
    /^\d+(\.\d+)?px$/,    // Dimensions en pixels
    /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/  // Emails
  ],
  keyNaming: {
    separator: '.',
    case: 'camelCase',
    maxLength: 50
  },
  extraction: {
    minLength: 2,
    maxLength: 1000,
    includeComments: true,
    includeJSX: true,
    includeProps: true
  }
} 