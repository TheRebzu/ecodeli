import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function CourierDashboard() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Tableau de bord Livreur</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Livraisons du jour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus du mois</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234 €</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Note moyenne</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.8/5</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kilomètres parcourus</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">152 km</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

