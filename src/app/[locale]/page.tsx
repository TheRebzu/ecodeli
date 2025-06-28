// Page d'accueil EcoDeli
import { getTranslations } from "next-intl/server"
import Link from "next/link"

export default async function HomePage() {
  const t = await getTranslations()

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-green-600"></div>
              <span className="text-xl font-bold text-gray-900">EcoDeli</span>
            </div>
            
            <nav className="hidden md:flex items-center space-x-6">
              <Link href="/services" className="text-gray-600 hover:text-green-600">
                {t('navigation.services')}
              </Link>
              <Link href="/pricing" className="text-gray-600 hover:text-green-600">
                {t('navigation.pricing')}
              </Link>
              <Link href="/about" className="text-gray-600 hover:text-green-600">
                {t('navigation.about')}
              </Link>
            </nav>

            <div className="flex items-center space-x-4">
              <Link 
                href="/login" 
                className="text-gray-600 hover:text-green-600 font-medium"
              >
                {t('auth.login.loginButton')}
              </Link>
              <Link 
                href="/register" 
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                {t('auth.register.title')}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            {t('dashboard.welcome')} 
            <span className="text-green-600"> EcoDeli</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            La plateforme de crowdshipping qui révolutionne la livraison.<br />
            <span className="text-green-600 font-semibold">
              Écologique • Économique • Solidaire
            </span>
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Envoyer un colis</h3>
              <p className="text-gray-600 text-sm">
                Faites livrer vos colis par des particuliers sur leur trajet
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Services à la personne</h3>
              <p className="text-gray-600 text-sm">
                Réservez des services : transport, courses, garde d'animaux
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/register/client"
              className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Commencer maintenant
            </Link>
            <Link 
              href="/register/deliverer"
              className="border-2 border-green-600 text-green-600 px-8 py-3 rounded-lg hover:bg-green-50 transition-colors font-medium"
            >
              Devenir livreur
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="h-6 w-6 rounded-full bg-green-600"></div>
                <span className="font-bold text-gray-900">EcoDeli</span>
              </div>
              <p className="text-sm text-gray-600">
                {t('footer.description')}
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Services</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="/services" className="hover:text-green-600">Livraison de colis</Link></li>
                <li><Link href="/services" className="hover:text-green-600">Transport de personnes</Link></li>
                <li><Link href="/services" className="hover:text-green-600">Services à domicile</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Entreprise</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="/about" className="hover:text-green-600">{t('footer.links.about')}</Link></li>
                <li><Link href="/contact" className="hover:text-green-600">{t('footer.links.contact')}</Link></li>
                <li><Link href="/become-delivery" className="hover:text-green-600">Devenir livreur</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Légal</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="/legal" className="hover:text-green-600">{t('footer.links.legal')}</Link></li>
                <li><Link href="/privacy" className="hover:text-green-600">{t('footer.links.privacy')}</Link></li>
                <li><Link href="/terms" className="hover:text-green-600">{t('footer.links.terms')}</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t mt-8 pt-6 text-center text-sm text-gray-600">
            {t('footer.copyright')}
          </div>
        </div>
      </footer>
    </div>
  )
}