import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"
import { Package, Users, CreditCard, Activity } from "lucide-react"

const stats = [
  {
    name: "Livraisons totales",
    value: "156",
    icon: Package,
    description: "↗︎ 23% par rapport au mois dernier",
  },
  {
    name: "Utilisateurs actifs",
    value: "2,345",
    icon: Users,
    description: "↗︎ 15% par rapport au mois dernier",
  },
  {
    name: "Revenu mensuel",
    value: "45,231€",
    icon: CreditCard,
    description: "↗︎ 8% par rapport au mois dernier",
  },
  {
    name: "Taux de satisfaction",
    value: "98%",
    icon: Activity,
    description: "↗︎ 3% par rapport au mois dernier",
  },
]

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader heading="Tableau de bord" text="Bienvenue sur votre tableau de bord EcoDeli" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Vue d'ensemble</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] flex items-center justify-center text-muted-foreground">Graphique d'activité</div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Activités récentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">Nouvelle livraison #{i}</p>
                    <p className="text-sm text-muted-foreground">Il y a {i * 2} heures</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

