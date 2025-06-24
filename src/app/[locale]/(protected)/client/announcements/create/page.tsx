// Page de création d'annonce
import { useTranslations } from "next-intl"
import Link from "next/link"
import { CreateAnnouncementForm } from "@/features/announcements/components/create-announcement-form"

export default function CreateAnnouncementPage() {
  const t = useTranslations()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/client/announcements" 
            className="text-green-600 hover:text-green-700 text-sm font-medium mb-4 inline-block"
          >
            ← Retour aux annonces
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Créer une nouvelle annonce
          </h1>
          <p className="text-gray-600">
            Publiez votre demande de livraison et recevez des propositions de livreurs
          </p>
        </div>

        {/* Informations sur les abonnements */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <h3 className="font-medium text-blue-900 mb-2">
            📋 Limites selon votre abonnement
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
            <div>
              <span className="font-medium">Gratuit:</span> 3 annonces/mois
            </div>
            <div>
              <span className="font-medium">Starter:</span> 20 annonces/mois
            </div>
            <div>
              <span className="font-medium">Premium:</span> Illimité
            </div>
          </div>
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <CreateAnnouncementForm />
          </div>
        </div>

        {/* Conseils */}
        <div className="mt-8 bg-green-50 rounded-lg p-6">
          <h3 className="font-medium text-green-900 mb-3">
            💡 Conseils pour une annonce réussie
          </h3>
          <ul className="space-y-2 text-sm text-green-800">
            <li>• Soyez précis dans la description du colis</li>
            <li>• Indiquez des adresses complètes et précises</li>
            <li>• Proposez un prix juste et attractif</li>
            <li>• Mentionnez si le colis est fragile ou urgent</li>
            <li>• Soyez disponible pour répondre aux questions des livreurs</li>
          </ul>
        </div>
      </div>
    </div>
  )
}