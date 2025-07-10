// Page de création de trajet livreur EcoDeli
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'

export default async function CreateRoutePage({ params }: { params: Promise<{ locale: string }> }) {
  // Await params first
  const { locale } = await params
  
  // Sécurité : authentification et rôle
  const session = await auth()
  if (!session || session.user.role !== 'DELIVERER') {
    notFound()
  }

  // Traductions (stub)
  // @ts-ignore
  const t = (key: string) => key

  // Affichage du formulaire (statique, à remplacer par un vrai formulaire côté client)
  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">{t('Créer un trajet')}</h1>
      <form method="POST" action={`/${locale}/api/deliverer/routes`} className="space-y-4">
        <div>
          <label className="block mb-1">{t('Point de départ')}</label>
          <input name="startLocation" className="border rounded px-2 py-1 w-full" required minLength={5} />
        </div>
        <div>
          <label className="block mb-1">{t('Destination')}</label>
          <input name="endLocation" className="border rounded px-2 py-1 w-full" required minLength={5} />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block mb-1">{t('Heure de départ')}</label>
            <input name="startTime" type="time" className="border rounded px-2 py-1 w-full" required />
          </div>
          <div className="flex-1">
            <label className="block mb-1">{t('Heure d\'arrivée')}</label>
            <input name="endTime" type="time" className="border rounded px-2 py-1 w-full" required />
          </div>
        </div>
        <div>
          <label className="block mb-1">{t('Jours de la semaine')}</label>
          <input name="daysOfWeek" className="border rounded px-2 py-1 w-full" placeholder="Lundi,Mardi,..." required />
        </div>
        <div>
          <label className="block mb-1">{t('Type de véhicule')}</label>
          <select name="vehicleType" className="border rounded px-2 py-1 w-full">
            <option value="CAR">Voiture</option>
            <option value="BIKE">Vélo</option>
            <option value="SCOOTER">Scooter</option>
            <option value="TRUCK">Camion</option>
            <option value="WALKING">À pied</option>
          </select>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block mb-1">{t('Distance max (km)')}</label>
            <input name="maxDistance" type="number" min={1} max={50} className="border rounded px-2 py-1 w-full" required />
          </div>
          <div className="flex-1">
            <label className="block mb-1">{t('Prix min (€)')}</label>
            <input name="minPrice" type="number" min={5} max={100} className="border rounded px-2 py-1 w-full" required />
          </div>
        </div>
        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">{t('Créer')}</button>
      </form>
    </div>
  )
} 