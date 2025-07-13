// Page de sélection du type d'inscription
import { useTranslations } from "next-intl";
import Link from "next/link";

export default function RegisterPage() {
  const t = useTranslations();

  const userTypes = [
    {
      id: "client",
      title: "Client",
      description: "J'envoie des colis et réserve des services",
      icon: "👤",
      href: "/register/client",
      features: [
        "Envoi de colis",
        "Réservation de services",
        "Suivi en temps réel",
      ],
    },
    {
      id: "deliverer",
      title: "Livreur",
      description: "Je livre des colis sur mes trajets",
      icon: "🚚",
      href: "/register/deliverer",
      features: [
        "Revenus complémentaires",
        "Trajets flexibles",
        "Portefeuille intégré",
      ],
    },
    {
      id: "merchant",
      title: "Commerçant",
      description: "Je vends mes produits en ligne",
      icon: "🏪",
      href: "/register/merchant",
      features: ["Catalogue produits", "Lâcher de chariot", "Analytics"],
    },
    {
      id: "provider",
      title: "Prestataire",
      description: "Je propose des services à la personne",
      icon: "🔧",
      href: "/register/provider",
      features: ["Services à domicile", "Calendrier", "Facturation auto"],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Link href="/" className="inline-flex items-center space-x-2 mb-6">
            <div className="h-8 w-8 rounded-full bg-green-600"></div>
            <span className="text-xl font-bold text-gray-900">EcoDeli</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {t("auth.register.chooseType")}
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Choisissez le type de compte qui correspond à votre utilisation
            d'EcoDeli
          </p>
        </div>

        {/* Types d'utilisateurs */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {userTypes.map((type) => (
            <Link
              key={type.id}
              href={type.href}
              className="bg-white rounded-xl p-6 border hover:border-green-200 hover:shadow-lg transition-all group"
            >
              <div className="flex items-start space-x-4">
                <div className="text-3xl">{type.icon}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-green-600">
                    {type.title}
                  </h3>
                  <p className="text-gray-600 mb-4">{type.description}</p>
                  <ul className="space-y-1">
                    {type.features.map((feature, index) => (
                      <li
                        key={index}
                        className="text-sm text-gray-500 flex items-center"
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500 mr-2"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="text-green-600 group-hover:translate-x-1 transition-transform">
                  →
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Lien de connexion */}
        <div className="text-center">
          <p className="text-gray-600">
            Vous avez déjà un compte ?{" "}
            <Link
              href="/login"
              className="text-green-600 hover:text-green-700 font-medium"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
