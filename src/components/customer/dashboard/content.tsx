"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bell, Package, CreditCard, Calendar, MapPin, Clock } from "lucide-react"

interface CustomerDashboardProps {
  initialData?: {
    activeDeliveries: number
    totalSpent: number
    scheduledServices: number
    pendingReviews: number
  }
}

const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ initialData }) => {
  const [dashboardData, setDashboardData] = useState(
    initialData || {
      activeDeliveries: 0,
      totalSpent: 0,
      scheduledServices: 0,
      pendingReviews: 0,
    },
  )

  useEffect(() => {
    // Fetch dashboard data if not provided as initialData
    if (!initialData) {
      fetchDashboardData()
    }
  }, [initialData])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("/api/customer/dashboard")
      if (response.ok) {
        const data = await response.json()
        setDashboardData(data)
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    }
  }

  const mockDeliveryData = [
    { month: "Jan", deliveries: 4 },
    { month: "Feb", deliveries: 6 },
    { month: "Mar", deliveries: 3 },
    { month: "Apr", deliveries: 8 },
    { month: "May", deliveries: 5 },
  ]

  const activeDeliveries = [
    {
      id: 1,
      trackingNumber: "ED123456",
      status: "En transit",
      origin: "Paris",
      destination: "Marseille",
      estimatedDelivery: "24 Fév 2025",
    },
    {
      id: 2,
      trackingNumber: "ED789012",
      status: "En attente de collecte",
      origin: "Lyon",
      destination: "Paris",
      estimatedDelivery: "25 Fév 2025",
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Section de bienvenue */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Tableau de bord</h1>
        <button className="relative p-2 rounded-full bg-gray-100 dark:bg-gray-800">
          <Bell className="w-6 h-6" />
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full"></span>
        </button>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <Package className="w-8 h-8 mr-4 text-primary" />
            <div>
              <p className="text-sm font-medium">Livraisons actives</p>
              <h3 className="text-2xl font-bold">{dashboardData.activeDeliveries}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <CreditCard className="w-8 h-8 mr-4 text-primary" />
            <div>
              <p className="text-sm font-medium">Total dépensé</p>
              <h3 className="text-2xl font-bold">{dashboardData.totalSpent.toFixed(2)} €</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <Calendar className="w-8 h-8 mr-4 text-primary" />
            <div>
              <p className="text-sm font-medium">Services programmés</p>
              <h3 className="text-2xl font-bold">{dashboardData.scheduledServices}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <Clock className="w-8 h-8 mr-4 text-primary" />
            <div>
              <p className="text-sm font-medium">Avis en attente</p>
              <h3 className="text-2xl font-bold">{dashboardData.pendingReviews}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contenu principal */}
      <Tabs defaultValue="deliveries" className="space-y-4">
        <TabsList>
          <TabsTrigger value="deliveries">Livraisons</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="payments">Paiements</TabsTrigger>
        </TabsList>

        <TabsContent value="deliveries" className="space-y-4">
          {/* Graphique des livraisons */}
          <Card>
            <CardHeader>
              <CardTitle>Activité de livraison</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
                <p className="text-gray-500">Graphique des livraisons (à implémenter)</p>
              </div>
            </CardContent>
          </Card>

          {/* Livraisons actives */}
          <Card>
            <CardHeader>
              <CardTitle>Livraisons actives</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeDeliveries.map((delivery) => (
                  <div key={delivery.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Package className="w-6 h-6 text-primary" />
                      <div>
                        <p className="font-medium">{delivery.trackingNumber}</p>
                        <div className="flex items-center text-sm text-gray-500">
                          <MapPin className="w-4 h-4 mr-1" />
                          {delivery.origin} → {delivery.destination}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-primary">{delivery.status}</p>
                      <p className="text-sm text-gray-500">Est. {delivery.estimatedDelivery}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services">
          <Card>
            <CardHeader>
              <CardTitle>Services programmés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Cartes de service iraient ici */}
                <div className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">Transfert aéroport</h4>
                      <p className="text-sm text-gray-500">25 Fév 2025, 14:00</p>
                    </div>
                    <button className="px-4 py-2 text-sm bg-primary text-white rounded-md">Voir détails</button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Transactions récentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Les éléments de transaction iraient ici */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Service de livraison</p>
                    <p className="text-sm text-gray-500">24 Fév 2025</p>
                  </div>
                  <p className="font-medium">-35,50 €</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default CustomerDashboard

