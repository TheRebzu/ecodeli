// Page d'inscription livreur
import { useTranslations } from "next-intl"
import Link from "next/link"
import { DelivererRegisterForm } from "@/features/auth/components/deliverer-register-form"

export default function DelivererRegisterPage() {
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
          <div className="text-3xl mb-2">🚚</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('auth.register.deliverer.title', 'Inscription Livreur')}
          </h1>
          <p className="text-gray-600">
            {t('auth.register.deliverer.subtitle', "Devenez livreur et gagnez de l'argent sur vos trajets")}
          </p>
        </div>

        {/* Avantages */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-blue-900 mb-2">{t('auth.register.deliverer.advantagesTitle', 'Pourquoi devenir livreur ?')}</h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>💰 {t('auth.register.deliverer.advantage1', 'Revenus complémentaires flexibles')}</li>
            <li>🗺️ {t('auth.register.deliverer.advantage2', 'Rentabilisez vos trajets quotidiens')}</li>
            <li>⏰ {t('auth.register.deliverer.advantage3', 'Liberté totale de vos horaires')}</li>
            <li>🌱 {t('auth.register.deliverer.advantage4', "Contribuez à l'économie collaborative")}</li>
          </ul>
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <DelivererRegisterForm />
        </div>

        {/* Liens */}
        <div className="mt-6 text-center space-y-4">
          <Link
            href="/register"
            className="text-sm text-gray-600 hover:text-green-600"
          >
            {t('auth.register.chooseAnotherAccountType', '← Choisir un autre type de compte')}
          </Link>

          <div className="text-sm text-gray-600">
            {t('auth.register.alreadyHaveAccount', 'Vous avez déjà un compte ?')}{' '}
            <Link
              href="/login"
              className="text-green-600 hover:text-green-700 font-medium"
            >
              {t('auth.login.loginButton', 'Se connecter')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}