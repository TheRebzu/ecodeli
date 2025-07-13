import { useTranslations } from "next-intl";
import Link from "next/link";
import { CreateServiceRequestForm } from "@/features/services/components/create-service-request-form";

export default function CreateServiceRequestPage() {
  const t = useTranslations();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/client/service-requests"
            className="text-green-600 hover:text-green-700 text-sm font-medium mb-4 inline-block"
          >
            ← Retour aux demandes de services
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Créer une demande de service
          </h1>
          <p className="text-gray-600">
            Décrivez vos besoins et recevez des propositions de prestataires
            qualifiés
          </p>
        </div>

        {/* Informations sur les services */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <h3 className="font-medium text-blue-900 mb-2">
            🛠️ Services disponibles
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-blue-800">
            <div>• Ménage à domicile</div>
            <div>• Jardinage et entretien</div>
            <div>• Bricolage et réparations</div>
            <div>• Garde d'animaux</div>
            <div>• Cours particuliers</div>
            <div>• Soins esthétiques</div>
            <div>• Accompagnement seniors</div>
            <div>• Services personnalisés</div>
          </div>
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <CreateServiceRequestForm />
          </div>
        </div>

        {/* Conseils */}
        <div className="mt-8 bg-green-50 rounded-lg p-6">
          <h3 className="font-medium text-green-900 mb-3">
            💡 Conseils pour une demande réussie
          </h3>
          <ul className="space-y-2 text-sm text-green-800">
            <li>• Soyez précis dans la description de vos besoins</li>
            <li>• Indiquez une adresse complète et des instructions d'accès</li>
            <li>• Proposez un budget réaliste selon la complexité</li>
            <li>• Mentionnez toutes les contraintes spécifiques</li>
            <li>
              • Soyez disponible pour répondre aux questions des prestataires
            </li>
            <li>• Vérifiez les profils et avis avant de choisir</li>
          </ul>
        </div>

        {/* Types de services détaillés */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="font-medium text-gray-900 mb-4">
            📋 Types de services détaillés
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-medium text-gray-800 mb-2">
                🏠 Services d'entretien
              </h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Ménage complet ou partiel</li>
                <li>• Nettoyage de vitres</li>
                <li>• Entretien jardins et espaces verts</li>
                <li>• Tonte de pelouse</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-800 mb-2">
                🔧 Services techniques
              </h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Petites réparations</li>
                <li>• Montage de meubles</li>
                <li>• Installation d'équipements</li>
                <li>• Maintenance préventive</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-800 mb-2">
                👥 Services à la personne
              </h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Garde d'animaux à domicile</li>
                <li>• Accompagnement personnes âgées</li>
                <li>• Cours particuliers</li>
                <li>• Soins esthétiques</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-800 mb-2">
                🛒 Services personnalisés
              </h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Courses sur mesure</li>
                <li>• Aide administrative</li>
                <li>• Assistance informatique</li>
                <li>• Services sur demande</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
