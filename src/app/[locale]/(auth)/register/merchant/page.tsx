// Page d'inscription commerçant
import { useTranslations } from "next-intl"
import Link from "next/link"
import { MerchantRegisterForm } from "@/features/auth/components/merchant-register-form"

export default function MerchantRegisterPage() {
  const t = useTranslations()

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 mb-6">
            <div className="h-8 w-8 rounded-full bg-green-600"></div>
            <span className="text-xl font-bold text-gray-900">EcoDeli</span>
          </Link>
          <div className="text-3xl mb-2">🏪</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Inscription Commerçant
          </h1>
          <p className="text-gray-600">
            Rejoignez notre réseau de commerçants partenaires
          </p>
        </div>

        {/* Avantages */}
        <div className="bg-purple-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-purple-900 mb-2">Avantages commerçant</h3>
          <ul className="space-y-1 text-sm text-purple-800">
            <li>📈 Augmentez vos ventes en ligne</li>
            <li>🛒 Service de lâcher de chariot</li>
            <li>📊 Analytics et rapports détaillés</li>
            <li>🤝 Commission attractive</li>
          </ul>
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <MerchantRegisterForm />
        </div>

        {/* Liens */}
        <div className="mt-6 text-center space-y-4">
          <Link 
            href="/register" 
            className="text-sm text-gray-600 hover:text-green-600"
          >
            ← Choisir un autre type de compte
          </Link>
          
          <div className="text-sm text-gray-600">
            Vous avez déjà un compte ?{' '}
            <Link 
              href="/login" 
              className="text-green-600 hover:text-green-700 font-medium"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}