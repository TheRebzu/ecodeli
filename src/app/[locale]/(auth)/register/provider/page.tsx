// Page d'inscription prestataire
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ProviderRegisterForm } from "@/features/auth/components/provider-register-form";

export default function ProviderRegisterPage() {
  const t = useTranslations();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 mb-6">
            <div className="h-8 w-8 rounded-full bg-green-600"></div>
            <span className="text-xl font-bold text-gray-900">EcoDeli</span>
          </Link>
          <div className="text-3xl mb-2">🔧</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Inscription Prestataire
          </h1>
          <p className="text-gray-600">
            Créez votre compte pour proposer des services à la personne
          </p>
        </div>

        {/* Avantages */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Pourquoi devenir prestataire EcoDeli ?
          </h2>
          <ul className="space-y-3">
            <li className="flex items-start space-x-3">
              <div className="h-2 w-2 rounded-full bg-green-500 mt-2"></div>
              <div>
                <p className="font-medium text-gray-900">
                  Revenus complémentaires
                </p>
                <p className="text-sm text-gray-600">
                  Fixez vos tarifs et gagnez de l'argent avec vos compétences
                </p>
              </div>
            </li>
            <li className="flex items-start space-x-3">
              <div className="h-2 w-2 rounded-full bg-green-500 mt-2"></div>
              <div>
                <p className="font-medium text-gray-900">
                  Flexibilité totale
                </p>
                <p className="text-sm text-gray-600">
                  Travaillez quand vous voulez, où vous voulez
                </p>
              </div>
            </li>
            <li className="flex items-start space-x-3">
              <div className="h-2 w-2 rounded-full bg-green-500 mt-2"></div>
              <div>
                <p className="font-medium text-gray-900">
                  Facturation automatique
                </p>
                <p className="text-sm text-gray-600">
                  Factures générées automatiquement chaque mois
                </p>
              </div>
            </li>
            <li className="flex items-start space-x-3">
              <div className="h-2 w-2 rounded-full bg-green-500 mt-2"></div>
              <div>
                <p className="font-medium text-gray-900">
                  Plateforme sécurisée
                </p>
                <p className="text-sm text-gray-600">
                  Paiements sécurisés et assurance responsabilité civile
                </p>
              </div>
            </li>
          </ul>
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <ProviderRegisterForm />
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
            Vous avez déjà un compte ?{" "}
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
  );
}