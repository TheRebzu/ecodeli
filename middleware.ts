import createMiddleware from 'next-intl/middleware'

export default createMiddleware({
  // Liste des locales supportées
  locales: ['fr', 'en', 'es', 'de', 'it'],
  
  // Locale par défaut
  defaultLocale: 'fr',
  
  // Préfixe obligatoire pour toutes les routes
  localePrefix: 'always'
})

export const config = {
  // Routes à traiter par le middleware
  matcher: [
    // Toutes les routes sauf les fichiers statiques et API
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
    // Page d'accueil
    '/'
  ]
}