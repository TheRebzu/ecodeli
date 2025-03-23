import { Suspense } from "react"
import Link from "next/link"
import { 
  AlertCircle, 
  ArrowRight, 
  BarChart, 
  Box, 
  Clock, 
  DollarSign, 
  Download, 
  Filter, 
  Layers, 
  RefreshCw, 
  Search, 
  Settings,
  Truck, 
  Users, 
  UserPlus,
  Bell,
  FileText
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AdminShipmentChart, AdminUserChart } from "@/components/admin/admin-charts"
import { getAdminDashboardData } from "@/lib/actions/admin-actions"

// Types for dashboard data
type RecentUser = {
  id: string
  name: string
  email: string
  role: string
}

type RecentShipment = {
  id: string
  origin: string
  destination: string
  status: string
}

export default async function AdminDashboard() {
  const { stats, recentUsers, recentShipments, userData, shipmentData } = await getAdminDashboardData()

  return (
    <div className="flex flex-col w-full">
      {/* Header avec outils admin */}
      <div className="bg-background border-b sticky top-0 z-30">
        <div className="container flex h-16 items-center justify-between py-4 gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight hidden md:block">Administration</h1>
            <span className="hidden md:flex bg-primary/10 text-primary px-2 py-0.5 rounded-md text-xs font-medium">v1.0</span>
          </div>
          <div className="flex items-center gap-2 md:gap-4 ml-auto">
            <div className="relative w-full md:w-64 hidden md:flex">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Rechercher..."
                className="w-full pl-8"
              />
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9">
              <RefreshCw className="h-4 w-4" />
              <span className="sr-only">Actualiser</span>
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9">
              <Settings className="h-4 w-4" />
              <span className="sr-only">Paramètres</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="ml-auto gap-1 hidden md:flex">
                  <Filter className="h-3.5 w-3.5" />
                  <span>Filtres</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filtrer par</DropdownMenuLabel>
                <DropdownMenuItem>Aujourd&apos;hui</DropdownMenuItem>
                <DropdownMenuItem>Cette semaine</DropdownMenuItem>
                <DropdownMenuItem>Ce mois-ci</DropdownMenuItem>
                <DropdownMenuItem>Personnalisé...</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" className="gap-1 hidden md:flex">
              <Download className="h-3.5 w-3.5" />
              <span>Exporter</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 container space-y-6 p-4 md:p-8 pt-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Tableau de bord</h2>
            <p className="text-muted-foreground">Vue d&apos;ensemble de votre plateforme</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8">
              <Clock className="mr-2 h-3.5 w-3.5" />
              <span>Dernière mise à jour : maintenant</span>
            </Button>
          </div>
        </div>
        
        {!stats ? (
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Attention</AlertTitle>
            <AlertDescription>
              Impossible de charger les statistiques du dashboard. Veuillez réessayer plus tard.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Utilisateurs totaux</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <div className="flex items-center mt-1">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    +{stats.newUsers}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-2">ce mois</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Livraisons</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalShipments}</div>
                <div className="flex items-center mt-1">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {stats.activeShipments}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-2">en cours</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Produits</CardTitle>
                <Box className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalProducts}</div>
                <div className="flex items-center mt-1">
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    {stats.lowStockProducts}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-2">stock faible</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenus</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.revenue.toLocaleString()} €</div>
                <div className="flex items-center mt-1">
                  <Badge variant={stats.revenueIncrease >= 0 ? "outline" : "destructive"} className={stats.revenueIncrease >= 0 ? "bg-green-50 text-green-700 border-green-200" : ""}>
                    {stats.revenueIncrease >= 0 ? "+" : ""}{stats.revenueIncrease}%
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-2">vs. mois précédent</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
            <TabsTrigger value="analytics">Analytiques</TabsTrigger>
            <TabsTrigger value="reports">Rapports</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-6">
              <Card className="md:col-span-4">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle>Livraisons récentes</CardTitle>
                    <CardDescription>
                      {recentShipments.length} dernières livraisons
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Layers className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Actualiser</DropdownMenuItem>
                      <DropdownMenuItem>Voir tous</DropdownMenuItem>
                      <DropdownMenuItem>Exporter</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  {recentShipments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="rounded-full bg-primary/10 p-4 mb-4">
                        <Truck className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold mb-1">Aucune livraison récente</h3>
                      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                        Les livraisons apparaîtront ici dès qu&apos;elles seront créées.
                      </p>
                      <Button asChild size="sm">
                        <Link href="/admin/shipments/new">
                          Créer une livraison
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentShipments.map((shipment: RecentShipment) => (
                        <div className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0" key={shipment.id}>
                          <div className="flex items-center gap-3">
                            <div className="rounded-full p-2 bg-primary/10">
                              <Truck className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium leading-none mb-1">
                                #{shipment.id.substring(0, 8)}
                              </p>
                              <p className="text-xs text-muted-foreground flex items-center">
                                {shipment.origin} 
                                <ArrowRight className="inline h-3 w-3 mx-1" /> 
                                {shipment.destination}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div>{getShipmentStatusBadge(shipment.status)}</div>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="border-t bg-muted/50 px-6 py-3">
                  <Button asChild variant="ghost" size="sm" className="gap-1 ml-auto">
                    <Link href="/admin/shipments">
                      <span>Voir toutes les livraisons</span>
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
              
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Utilisateurs récents</CardTitle>
                  <CardDescription>
                    Dernières inscriptions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {recentUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="rounded-full bg-primary/10 p-4 mb-4">
                        <UserPlus className="h-6 w-6 text-primary" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Aucun utilisateur récent
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentUsers.map((user: RecentUser) => (
                        <div className="flex items-center gap-3" key={user.id}>
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={`https://avatar.vercel.sh/${user.id}`} alt={user.name} />
                            <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-none truncate">{user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                          {getRoleLabel(user.role)}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="border-t bg-muted/50 px-6 py-3">
                  <Button asChild variant="ghost" size="sm" className="gap-1 ml-auto">
                    <Link href="/admin/users">
                      <span>Tous les utilisateurs</span>
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
            
            <div className="grid gap-4 grid-cols-1 md:grid-cols-6">
              <Suspense fallback={<ChartSkeleton />}>
                <AdminUserChart data={userData} />
                <AdminShipmentChart data={shipmentData} />
              </Suspense>
            </div>
            
            <div className="grid gap-4 grid-cols-1 md:grid-cols-3 xl:grid-cols-4">
              <Card className="md:col-span-1 xl:col-span-1">
                <CardHeader>
                  <CardTitle>Actions rapides</CardTitle>
                  <CardDescription>
                    Opérations courantes
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2">
                  <Button variant="secondary" className="justify-start" asChild>
                    <Link href="/admin/users/new">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Nouvel utilisateur
                    </Link>
                  </Button>
                  <Button variant="secondary" className="justify-start" asChild>
                    <Link href="/admin/shipments/new">
                      <Truck className="mr-2 h-4 w-4" />
                      Nouvelle livraison
                    </Link>
                  </Button>
                  <Button variant="secondary" className="justify-start" asChild>
                    <Link href="/admin/products/new">
                      <Box className="mr-2 h-4 w-4" />
                      Nouveau produit
                    </Link>
                  </Button>
                  <Button variant="secondary" className="justify-start" asChild>
                    <Link href="/admin/reports/generate">
                      <BarChart className="mr-2 h-4 w-4" />
                      Générer un rapport
                    </Link>
                  </Button>
                </CardContent>
              </Card>
              {/* Ajouter plus de cartes ici selon les besoins */}
            </div>
          </TabsContent>
          
          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Analytiques avancées</CardTitle>
                <CardDescription>
                  Analyse détaillée de votre plateforme
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-10">
                <div className="text-center">
                  <div className="rounded-full bg-primary/10 p-4 mx-auto mb-4 w-fit">
                    <BarChart className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">Module analytique</h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                    Cette fonctionnalité sera disponible prochainement.
                  </p>
                  <Button asChild size="sm">
                    <Link href="/admin/analytics">
                      Explorer les données
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Rapports</CardTitle>
                <CardDescription>
                  Générer et consulter des rapports
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-10">
                <div className="text-center">
                  <div className="rounded-full bg-primary/10 p-4 mx-auto mb-4 w-fit">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">Module de rapports</h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                    Générez des rapports personnalisés pour vos besoins métier.
                  </p>
                  <Button asChild size="sm">
                    <Link href="/admin/reports">
                      Accéder aux rapports
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                  Dernières alertes et notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-10">
                <div className="text-center">
                  <div className="rounded-full bg-primary/10 p-4 mx-auto mb-4 w-fit">
                    <Bell className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">Centre de notifications</h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                    Aucune nouvelle notification pour le moment.
                  </p>
                  <Button asChild size="sm">
                    <Link href="/admin/notifications/settings">
                      Configurer les notifications
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function ChartSkeleton() {
  return (
    <>
      <Card className="col-span-3">
        <CardHeader>
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
      <Card className="col-span-3">
        <CardHeader>
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    </>
  )
}

function getShipmentStatusBadge(status: string) {
  switch (status) {
    case 'PENDING':
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">En attente</Badge>
    case 'PICKED_UP':
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Récupéré</Badge>
    case 'IN_TRANSIT':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">En transit</Badge>
    case 'STORED':
      return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">Stocké</Badge>
    case 'DELIVERED':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Livré</Badge>
    case 'CANCELLED':
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Annulé</Badge>
    case 'FAILED':
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Échoué</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function getRoleLabel(role: string) {
  switch (role) {
    case 'CLIENT':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Client</Badge>
    case 'COURIER':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Livreur</Badge>
    case 'MERCHANT':
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Commerçant</Badge>
    case 'PROVIDER':
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Fournisseur</Badge>
    case 'ADMIN':
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Admin</Badge>
    default:
      return <Badge variant="outline">{role}</Badge>
  }
}
