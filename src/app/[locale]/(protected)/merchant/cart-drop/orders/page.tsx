"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Package, 
  MapPin, 
  User, 
  Euro,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Users,
  ShoppingCart
} from 'lucide-react'
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

interface TimeSlot {
  id: string
  day: number
  startTime: string
  endTime: string
  maxOrders: number
  currentOrders: number
  isActive: boolean
}

interface CartDropOrder {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  items: Array<{
    name: string
    quantity: number
    price: number
  }>
  totalAmount: number
  deliveryAddress: string
  deliveryFee: number
  scheduledDate: string
  timeSlotId: string
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'
  notes?: string
  createdAt: string
}

interface WeeklyStats {
  totalOrders: number
  totalRevenue: number
  avgOrderValue: number
  completionRate: number
}

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PREPARING: 'bg-orange-100 text-orange-800',
  READY: 'bg-green-100 text-green-800',
  OUT_FOR_DELIVERY: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-800'
}

const STATUS_LABELS = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  PREPARING: 'En préparation',
  READY: 'Prête',
  OUT_FOR_DELIVERY: 'En livraison',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée'
}

const DAYS_OF_WEEK = [
  'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'
]

export default function CartDropOrdersPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date())
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [orders, setOrders] = useState<CartDropOrder[]>([])
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null)
  const [filteredOrders, setFilteredOrders] = useState<CartDropOrder[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedOrder, setSelectedOrder] = useState<CartDropOrder | null>(null)

  // Charger les données
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/merchant/cart-drop/schedule', {
          credentials: 'include'
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setTimeSlots(data.timeSlots || [])
            setOrders(data.orders || [])
            setWeeklyStats(data.weeklyStats || null)
          }
        }
      } catch (error) {
        console.error('Error fetching cart-drop data:', error)
        toast({
          title: "Erreur",
          description: "Impossible de charger les données",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [toast])

  // Filtrer les commandes
  useEffect(() => {
    let filtered = orders

    // Filtre par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(order => 
        order.orderNumber.toLowerCase().includes(query) ||
        order.customerName.toLowerCase().includes(query) ||
        order.customerEmail.toLowerCase().includes(query) ||
        order.deliveryAddress.toLowerCase().includes(query)
      )
    }

    // Filtre par statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter)
    }

    setFilteredOrders(filtered)
  }, [orders, searchQuery, statusFilter])

  // Changer le statut d'une commande
  const updateOrderStatus = async (orderId: string, newStatus: CartDropOrder['status']) => {
    try {
      const response = await fetch(`/api/merchant/cart-drop/schedule`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          orderId,
          status: newStatus
        })
      })

      if (response.ok) {
        const updatedOrders = orders.map(order =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
        setOrders(updatedOrders)
        
        toast({
          title: "Statut mis à jour",
          description: `Commande ${orders.find(o => o.id === orderId)?.orderNumber} mise à jour`,
          variant: "default"
        })
      }
    } catch (error) {
      console.error('Error updating order status:', error)
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive"
      })
    }
  }

  // Navigation semaine
  const goToPreviousWeek = () => {
    setCurrentWeek(prev => addDays(prev, -7))
  }

  const goToNextWeek = () => {
    setCurrentWeek(prev => addDays(prev, 7))
  }

  // Obtenir les commandes par créneau et date
  const getOrdersForSlot = (slotId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return orders.filter(order => 
      order.timeSlotId === slotId && 
      order.scheduledDate === dateStr
    )
  }

  // Calculer les statistiques de la semaine
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Planification Livraisons</h1>
          <p className="text-muted-foreground mt-2">
            Gérez vos commandes de lâcher de chariot et planifiez les livraisons
          </p>
        </div>
      </div>

      {/* Statistiques hebdomadaires */}
      {weeklyStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Commandes</p>
                  <p className="text-2xl font-bold">{weeklyStats.totalOrders}</p>
                </div>
                <ShoppingCart className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Chiffre d'affaires</p>
                  <p className="text-2xl font-bold">{weeklyStats.totalRevenue.toFixed(2)}€</p>
                </div>
                <Euro className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Panier moyen</p>
                  <p className="text-2xl font-bold">{weeklyStats.avgOrderValue.toFixed(2)}€</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Taux de completion</p>
                  <p className="text-2xl font-bold">{weeklyStats.completionRate.toFixed(1)}%</p>
                </div>
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="schedule" className="space-y-6">
        <TabsList>
          <TabsTrigger value="schedule">Planning hebdomadaire</TabsTrigger>
          <TabsTrigger value="orders">Liste des commandes</TabsTrigger>
        </TabsList>

        {/* Planning hebdomadaire */}
        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Planning de la semaine
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-medium">
                    {format(weekStart, 'dd MMM', { locale: fr })} - {format(weekEnd, 'dd MMM yyyy', { locale: fr })}
                  </span>
                  <Button variant="outline" size="sm" onClick={goToNextWeek}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4">Créneaux</th>
                      {weekDays.map((day, index) => (
                        <th key={index} className="text-center p-4 min-w-[120px]">
                          <div className="space-y-1">
                            <div className="font-medium">{DAYS_OF_WEEK[day.getDay()]}</div>
                            <div className="text-sm text-muted-foreground">
                              {format(day, 'dd/MM')}
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {timeSlots.map((slot) => (
                      <tr key={slot.id} className="border-b">
                        <td className="p-4">
                          <div className="space-y-1">
                            <div className="font-medium">
                              {slot.startTime} - {slot.endTime}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Max: {slot.maxOrders} commandes
                            </div>
                          </div>
                        </td>
                        {weekDays.map((day, dayIndex) => {
                          const dayOrders = getOrdersForSlot(slot.id, day)
                          const isSlotActive = slot.isActive && day.getDay() === dayIndex
                          
                          return (
                            <td key={dayIndex} className="p-2">
                              <div className={cn(
                                "min-h-[80px] border rounded-lg p-2",
                                isSlotActive ? "bg-background" : "bg-muted/50"
                              )}>
                                {isSlotActive && (
                                  <>
                                    <div className="flex items-center justify-between mb-2">
                                      <Badge variant="outline" className="text-xs">
                                        {dayOrders.length}/{slot.maxOrders}
                                      </Badge>
                                    </div>
                                    <div className="space-y-1">
                                      {dayOrders.slice(0, 3).map((order) => (
                                        <div
                                          key={order.id}
                                          className="text-xs p-1 bg-primary/10 rounded cursor-pointer hover:bg-primary/20"
                                          onClick={() => setSelectedOrder(order)}
                                        >
                                          <div className="font-medium truncate">
                                            {order.orderNumber}
                                          </div>
                                          <div className="text-muted-foreground truncate">
                                            {order.customerName}
                                          </div>
                                        </div>
                                      ))}
                                      {dayOrders.length > 3 && (
                                        <div className="text-xs text-muted-foreground text-center">
                                          +{dayOrders.length - 3} autres
                                        </div>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Liste des commandes */}
        <TabsContent value="orders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Commandes
              </CardTitle>
              <CardDescription>
                Gérez toutes vos commandes de lâcher de chariot
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filtres */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher par numéro, client, adresse..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filtrer par statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    {Object.entries(STATUS_LABELS).map(([status, label]) => (
                      <SelectItem key={status} value={status}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Liste des commandes */}
              <div className="space-y-4">
                {filteredOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune commande trouvée</p>
                  </div>
                ) : (
                  filteredOrders.map((order) => (
                    <Card key={order.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-4">
                              <h3 className="font-semibold">{order.orderNumber}</h3>
                              <Badge className={cn("text-xs", STATUS_COLORS[order.status])}>
                                {STATUS_LABELS[order.status]}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span>{order.customerName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span className="truncate">{order.deliveryAddress}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Euro className="h-4 w-4 text-muted-foreground" />
                                <span>{order.totalAmount.toFixed(2)}€</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select
                              value={order.status}
                              onValueChange={(value) => updateOrderStatus(order.id, value as CartDropOrder['status'])}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(STATUS_LABELS).map(([status, label]) => (
                                  <SelectItem key={status} value={status}>
                                    {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedOrder(order)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal détail commande */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Détails de la commande {selectedOrder.orderNumber}</span>
                <Button variant="outline" size="sm" onClick={() => setSelectedOrder(null)}>
                  ×
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Client</Label>
                  <p className="font-medium">{selectedOrder.customerName}</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.customerEmail}</p>
                </div>
                <div>
                  <Label>Statut</Label>
                  <Badge className={cn("text-xs", STATUS_COLORS[selectedOrder.status])}>
                    {STATUS_LABELS[selectedOrder.status]}
                  </Badge>
                </div>
              </div>
              
              <div>
                <Label>Adresse de livraison</Label>
                <p className="font-medium">{selectedOrder.deliveryAddress}</p>
              </div>

              <div>
                <Label>Articles commandés</Label>
                <div className="space-y-2 mt-2">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div>
                        <span className="font-medium">{item.name}</span>
                        <span className="text-muted-foreground"> x{item.quantity}</span>
                      </div>
                      <span>{(item.price * item.quantity).toFixed(2)}€</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <span className="font-medium">Total (livraison incluse)</span>
                <span className="font-bold">{(selectedOrder.totalAmount + selectedOrder.deliveryFee).toFixed(2)}€</span>
              </div>

              {selectedOrder.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="text-sm">{selectedOrder.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
} 