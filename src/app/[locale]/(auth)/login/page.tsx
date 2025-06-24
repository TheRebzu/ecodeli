// Page de connexion EcoDeli
import { useTranslations } from "next-intl"
import Link from "next/link"
import { LoginForm } from "@/features/auth/components/login-form"

export default function LoginPage() {
  const t = useTranslations()

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo et titre */}
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-full bg-green-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-900">EcoDeli</h1>
          <p className="text-gray-600 mt-2">{t('auth.login.subtitle')}</p>
        </div>

        {/* Formulaire de connexion */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {t('auth.login.title')}
          </h2>

          <LoginForm />

          {/* Liens */}
          <div className="mt-6 space-y-4">
            <div className="text-center">
              <Link 
                href="/forgot-password" 
                className="text-sm text-green-600 hover:text-green-700"
              >
                {t('auth.login.forgotPassword')}
              </Link>
            </div>

            <div className="border-t pt-4 text-center text-sm text-gray-600">
              {t('auth.login.noAccount')}{' '}
              <Link 
                href="/register" 
                className="text-green-600 hover:text-green-700 font-medium"
              >
                {t('auth.register.title')}
              </Link>
            </div>
          </div>
        </div>

        {/* Comptes de test */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">
            🧪 Comptes de test (mot de passe: Test123!)
          </h3>
          <div className="space-y-1 text-xs text-blue-800">
            <div>👨‍💼 Admin: admin@ecodeli.com</div>
            <div>👤 Client: client@ecodeli.com</div>
            <div>🚚 Livreur: deliverer@ecodeli.com</div>
            <div>🏪 Commerçant: merchant@ecodeli.com</div>
            <div>🔧 Prestataire: provider@ecodeli.com</div>
          </div>
        </div>
      </div>
    </div>
  )
}