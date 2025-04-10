'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronLeft, MapPin, Package, Calendar, Truck, Phone, MessageSquare, Shield, Clock, User, AlertTriangle, Check, X, Star, Map, Share2, Mail, Copy, Download, FileText, BarChart, Clock2, TrendingUp, Zap } from 'lucide-react'
import { AnnouncementV2 } from '@/shared/types/announcement-v2.types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import { Textarea } from '@/components/ui/textarea'

// Étendre le type AnnouncementV2 pour inclure les propriétés manquantes
interface ExtendedAnnouncementV2 extends AnnouncementV2 {
  isNegotiable?: boolean;
  weight?: number;
  width?: number;
  height?: number;
  length?: number;
  insuranceAmount?: number;
}

export default function AnnouncementDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const [announcement, setAnnouncement] = useState<ExtendedAnnouncementV2 | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false)
  const [selectedBidId, setSelectedBidId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [isReportProblemDialogOpen, setIsReportProblemDialogOpen] = useState(false)
  const [isRateDeliveryDialogOpen, setIsRateDeliveryDialogOpen] = useState(false)
  const [rating, setRating] = useState(5)
  const [problemDescription, setProblemDescription] = useState('')
  const [reviewComment, setReviewComment] = useState('')
  const [messages, setMessages] = useState<Array<{id: string; sender: string; content: string; timestamp: Date}>>([])
  const [messageText, setMessageText] = useState('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [trackingData, setTrackingData] = useState<{
    courierLocation?: {lat: number; lng: number};
    estimatedArrival?: Date;
    lastUpdated?: Date;
    status: string;
  } | null>(null)
  
  // Récupérer les détails de l'annonce
  const fetchAnnouncementDetails = async () => {
    if (!params.id) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      // Appeler l'API pour récupérer les détails de l'annonce
      const response = await fetch(`/api/client/announcements/${params.id}`)
      
      if (!response.ok) {
        throw new Error('Impossible de récupérer les détails de l\'annonce')
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Une erreur est survenue')
      }
      
      setAnnouncement(data.data)
    } catch (error) {
      console.error('Erreur lors de la récupération des détails:', error)
      setError(error instanceof Error ? error.message : 'Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }
  
  useEffect(() => {
    fetchAnnouncementDetails()
  }, [params.id])
  
  // Fonction pour accepter une offre
  const handleAcceptBid = async (bidId: string) => {
    setActionLoading(true)
    
    try {
      const response = await fetch(`/api/client/announcements/${params.id}/bids/${bidId}/accept`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error('Impossible d\'accepter cette offre')
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Une erreur est survenue')
      }
      
      // Mise à jour locale de l'annonce avec les nouvelles données
      setAnnouncement(data.data)
      
      toast({
        title: "Offre acceptée",
        description: "Vous avez accepté cette offre de livraison."
      })
      
      // Rafraîchir les détails de l'annonce
      fetchAnnouncementDetails()
    } catch (error) {
      console.error("Erreur lors de l'acceptation de l'offre:", error)
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'accepter cette offre. Veuillez réessayer.",
        variant: "destructive"
      })
    } finally {
      setActionLoading(false)
      setIsAcceptDialogOpen(false)
      setSelectedBidId(null)
    }
  }
  
  // Fonction pour refuser une offre
  const handleRejectBid = async (bidId: string) => {
    setActionLoading(true)
    
    try {
      const response = await fetch(`/api/client/announcements/${params.id}/bids/${bidId}/reject`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error('Impossible de refuser cette offre')
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Une erreur est survenue')
      }
      
      // Mise à jour locale de l'annonce avec les nouvelles données
      setAnnouncement(data.data)
      
      toast({
        title: "Offre refusée",
        description: "Vous avez refusé cette offre de livraison."
      })
    } catch (error) {
      console.error("Erreur lors du refus de l'offre:", error)
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de refuser cette offre. Veuillez réessayer.",
        variant: "destructive"
      })
    } finally {
      setActionLoading(false)
    }
  }
  
  // Fonction pour annuler une annonce
  const handleCancelAnnouncement = async () => {
    setActionLoading(true)
    
    try {
      const response = await fetch(`/api/client/announcements/${params.id}/cancel`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error('Impossible d\'annuler cette annonce')
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Une erreur est survenue')
      }
      
      // Mise à jour locale de l'annonce avec les nouvelles données
      setAnnouncement(data.data)
      
      toast({
        title: "Annonce annulée",
        description: "Votre annonce a été annulée avec succès."
      })
      
      // Rafraîchir la page après un court délai
      setTimeout(() => {
        router.refresh()
      }, 1500)
    } catch (error) {
      console.error("Erreur lors de l'annulation de l'annonce:", error)
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'annuler cette annonce. Veuillez réessayer.",
        variant: "destructive"
      })
    } finally {
      setActionLoading(false)
      setIsCancelDialogOpen(false)
    }
  }
  
  // Fonction pour supprimer l'annonce
  const handleDeleteAnnouncement = async () => {
    setActionLoading(true)
    
    try {
      // Dans une implémentation réelle, vous feriez l'appel API ici
      // const response = await fetch(`/api/announcements/${params.id}`, {
      //   method: 'DELETE',
      // });
      
      // Simuler une requête
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast({
        title: "Annonce supprimée",
        description: "Votre annonce a été supprimée avec succès."
      })
      
      // Rediriger vers la liste des annonces
      router.push('/client/announcements')
    } catch (error) {
      console.error("Erreur lors de la suppression de l'annonce:", error)
      toast({
        title: "Erreur",
        description: "Impossible de supprimer cette annonce. Veuillez réessayer.",
        variant: "destructive"
      })
    } finally {
      setActionLoading(false)
    }
  }
  
  // Fonction pour confirmer la livraison
  const handleConfirmDelivery = async () => {
    setActionLoading(true)
    
    try {
      // Dans une implémentation réelle, vous feriez l'appel API ici
      // const response = await fetch(`/api/announcements/${params.id}/confirm`, {
      //   method: 'POST',
      // });
      
      // Simuler une requête
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mise à jour locale de l'état
      if (announcement) {
        const updatedAnnouncement = {
          ...announcement,
          status: 'COMPLETED'
        }
        
        setAnnouncement(updatedAnnouncement as ExtendedAnnouncementV2)
        toast({
          title: "Livraison confirmée",
          description: "Vous avez confirmé la réception de votre colis."
        })
      }
    } catch (error) {
      console.error("Erreur lors de la confirmation de la livraison:", error)
      toast({
        title: "Erreur",
        description: "Impossible de confirmer la livraison. Veuillez réessayer.",
        variant: "destructive"
      })
    } finally {
      setActionLoading(false)
    }
  }
  
  // Fonction pour marquer l'annonce comme "En transit"
  const handleMarkInTransit = async () => {
    setActionLoading(true)
    
    try {
      // Dans une implémentation réelle, vous feriez l'appel API ici
      // const response = await fetch(`/api/announcements/${params.id}/transit`, {
      //   method: 'POST',
      // });
      
      // Simuler une requête
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mise à jour locale de l'état
      if (announcement) {
        const updatedAnnouncement = {
          ...announcement,
          status: 'IN_TRANSIT'
        }
        
        setAnnouncement(updatedAnnouncement as ExtendedAnnouncementV2)
        toast({
          title: "Statut mis à jour",
          description: "L&apos;annonce a été marquée comme \"En transit\"."
        })
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error)
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut. Veuillez réessayer.",
        variant: "destructive"
      })
    } finally {
      setActionLoading(false)
    }
  }
  
  // Fonction pour signaler un problème
  const handleReportProblem = async () => {
    setActionLoading(true)
    
    try {
      // Dans une implémentation réelle, vous feriez l'appel API ici
      // const response = await fetch(`/api/announcements/${params.id}/report-problem`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ description: problemDescription }),
      // });
      
      // Simuler une requête
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast({
        title: "Problème signalé",
        description: "Votre signalement a été envoyé. Un membre de notre équipe vous contactera prochainement."
      })
      
      setProblemDescription('')
      setIsReportProblemDialogOpen(false)
    } catch (error) {
      console.error("Erreur lors du signalement du problème:", error)
      toast({
        title: "Erreur",
        description: "Impossible de signaler le problème. Veuillez réessayer.",
        variant: "destructive"
      })
    } finally {
      setActionLoading(false)
    }
  }
  
  // Fonction pour évaluer la livraison
  const handleRateDelivery = async () => {
    setActionLoading(true)
    
    try {
      // Dans une implémentation réelle, vous feriez l'appel API ici
      // const response = await fetch(`/api/announcements/${params.id}/rate`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ rating, comment: reviewComment }),
      // });
      
      // Simuler une requête
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast({
        title: "Évaluation envoyée",
        description: "Merci d'avoir évalué cette livraison!"
      })
      
      setRating(5)
      setReviewComment('')
      setIsRateDeliveryDialogOpen(false)
    } catch (error) {
      console.error("Erreur lors de l'évaluation:", error)
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer l'évaluation. Veuillez réessayer.",
        variant: "destructive"
      })
    } finally {
      setActionLoading(false)
    }
  }
  
  // Fonction pour formatter les dates
  const formatDate = (date: Date) => {
    return format(date, 'dd MMMM yyyy', { locale: fr })
  }
  
  // Configuration des statuts pour l'affichage
  const statusConfig: Record<string, { label: string; color: string }> = {
    'PENDING': { label: 'En attente', color: 'bg-gray-100 text-gray-800' },
    'PUBLISHED': { label: 'Publiée', color: 'bg-blue-100 text-blue-800' },
    'ASSIGNED': { label: 'Assignée', color: 'bg-indigo-100 text-indigo-800' },
    'IN_TRANSIT': { label: 'En transit', color: 'bg-amber-100 text-amber-800' },
    'DELIVERED': { label: 'Livrée', color: 'bg-green-100 text-green-800' },
    'COMPLETED': { label: 'Terminée', color: 'bg-green-100 text-green-800' },
    'CANCELLED': { label: 'Annulée', color: 'bg-red-100 text-red-800' },
    'EXPIRED': { label: 'Expirée', color: 'bg-gray-100 text-gray-800' }
  }
  
  // Récupérer les messages entre le client et le livreur
  const fetchMessages = async () => {
    if (!params.id || !announcement || !['ASSIGNED', 'IN_TRANSIT', 'COMPLETED', 'DELIVERED'].includes(announcement.status)) return
    
    try {
      const response = await fetch(`/api/client/announcements/${params.id}/messages`)
      
      if (!response.ok) {
        console.error('Erreur lors de la récupération des messages')
        return
      }
      
      const data = await response.json()
      
      if (data.success && Array.isArray(data.data)) {
        setMessages(data.data)
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des messages:', error)
    }
  }
  
  // Envoyer un nouveau message
  const handleSendMessage = async () => {
    if (!params.id || !messageText.trim()) return
    
    setIsSendingMessage(true)
    
    try {
      const response = await fetch(`/api/client/announcements/${params.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: messageText.trim() })
      })
      
      if (!response.ok) {
        throw new Error('Impossible d\'envoyer le message')
      }
      
      const data = await response.json()
      
      if (data.success) {
        setMessageText('')
        // Rafraîchir la liste des messages
        fetchMessages()
      } else {
        toast({
          title: "Erreur",
          description: data.error || "Une erreur est survenue lors de l'envoi du message",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error)
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive"
      })
    } finally {
      setIsSendingMessage(false)
    }
  }
  
  // Récupérer les données de suivi en temps réel
  const fetchTrackingData = async () => {
    if (!params.id || !announcement || !['ASSIGNED', 'IN_TRANSIT'].includes(announcement.status)) return
    
    try {
      const response = await fetch(`/api/client/announcements/${params.id}/tracking`)
      
      if (!response.ok) {
        console.error('Erreur lors de la récupération des données de suivi')
        return
      }
      
      const data = await response.json()
      
      if (data.success) {
        setTrackingData(data.data)
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des données de suivi:', error)
    }
  }
  
  // Charger les données de suivi et les messages au chargement
  useEffect(() => {
    // Charger les messages fictifs
    if (announcement && (announcement.status === 'ASSIGNED' || announcement.status === 'IN_TRANSIT' || announcement.status === 'COMPLETED')) {
      const mockMessages = [
        {
          id: 'msg1',
          sender: 'client',
          content: 'Bonjour, y a-t-il un digicode pour l&apos;immeuble ?',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000)
        },
        {
          id: 'msg2',
          sender: 'courier',
          content: 'Bonjour, merci pour cette information. Je vous contacterai quand je serai sur place.',
          timestamp: new Date(Date.now() - 3.5 * 60 * 60 * 1000)
        }
      ]
      setMessages(mockMessages)
    }
    
    // Charger les données de suivi
    fetchTrackingData()
    
    // Mettre à jour les données de suivi périodiquement
    const trackingInterval = setInterval(fetchTrackingData, 30000) // Toutes les 30 secondes
    
    return () => clearInterval(trackingInterval)
  }, [announcement?.status])
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48 mt-1" />
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  if (error || !announcement) {
    return (
      <div className="space-y-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/client/announcements">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Retour aux annonces
          </Link>
        </Button>
        
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Erreur</h2>
            <p className="text-muted-foreground text-center">
              {error || "Impossible de trouver cette annonce"}
            </p>
            <Button asChild className="mt-4">
              <Link href="/client/announcements">
                Retour aux annonces
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* En-tête - Optimisation mobile */}
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 relative mb-8">
        <div>
          <Button variant="outline" size="sm" asChild className="mb-2">
            <Link href="/client/announcements">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Retour aux annonces
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">{announcement.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className={statusConfig[announcement.status].color}>
              {statusConfig[announcement.status].label}
            </Badge>
            <p className="text-sm text-muted-foreground">
              Créée le {formatDate(announcement.createdAt)}
            </p>
          </div>
        </div>
        
        {/* Bouton de partage */}
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" className="absolute top-0 right-0 md:relative md:top-auto md:right-auto">
            <Share2 className="h-4 w-4 mr-2" />
            Partager
          </Button>
        </AlertDialogTrigger>
        
        <div className="flex flex-wrap gap-2 mt-2 md:mt-0 w-full md:w-auto">
          <Button variant="outline">
            <Phone className="h-4 w-4 mr-2" />
            Contacter le support
          </Button>
          {announcement.status === 'PUBLISHED' && (
            <Button 
              variant="destructive" 
              onClick={() => setIsCancelDialogOpen(true)}
              disabled={actionLoading}
              className="w-full sm:w-auto"
            >
              Annuler l&apos;annonce
            </Button>
          )}
          {(announcement.status === 'PUBLISHED' || announcement.status === 'CANCELLED') && (
            <Button 
              variant="outline" 
              onClick={handleDeleteAnnouncement}
              disabled={actionLoading}
              className="w-full sm:w-auto"
            >
              Supprimer
            </Button>
          )}
          {announcement.status === 'ASSIGNED' && (
            <>
              <Button 
                variant="outline"
                onClick={handleMarkInTransit}
                disabled={actionLoading}
                className="w-full sm:w-auto"
              >
                <Truck className="h-4 w-4 mr-2" />
                Marquer en transit
              </Button>
            </>
          )}
          {announcement.status === 'IN_TRANSIT' && (
            <>
              <Button 
                variant="outline"
                onClick={handleConfirmDelivery}
                disabled={actionLoading}
                className="w-full sm:w-auto"
              >
                <Check className="h-4 w-4 mr-2" />
                Confirmer la livraison
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => setIsReportProblemDialogOpen(true)}
                disabled={actionLoading}
                className="w-full sm:w-auto"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Signaler un problème
              </Button>
            </>
          )}
          {announcement.status === 'COMPLETED' && (
            <Button 
              variant="outline"
              onClick={() => setIsRateDeliveryDialogOpen(true)}
              disabled={actionLoading}
              className="w-full sm:w-auto"
            >
              <Star className="h-4 w-4 mr-2" />
              Évaluer la livraison
            </Button>
          )}
          {(announcement.status === 'ASSIGNED' || announcement.status === 'IN_TRANSIT' || announcement.status === 'COMPLETED') && (
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="w-full sm:w-auto"
            >
              <FileText className="h-4 w-4 mr-2" />
              Récapitulatif
            </Button>
          )}
        </div>
      </div>
      
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="w-full max-w-full mb-6">
          <TabsTrigger value="details" className="flex-grow">Détails</TabsTrigger>
          <TabsTrigger value="offers" className="flex-grow">Offres ({announcement.bids?.length || 0})</TabsTrigger>
          <TabsTrigger value="messages" className="flex-grow">Messages ({messages.length})</TabsTrigger>
          <TabsTrigger value="tracking" className="flex-grow">
            <Map className="h-4 w-4 mr-2" />
            Suivi
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex-grow">
            <BarChart className="h-4 w-4 mr-2" />
            Analyse
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="space-y-6">
          {/* Détails de l'annonce */}
          <Card>
            <CardHeader>
              <CardTitle>Détails de l&apos;annonce</CardTitle>
              <CardDescription>Informations générales sur cette livraison</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">Description</h3>
                <p className="text-sm">{announcement.description}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Adresse de ramassage */}
                <div className="space-y-4">
                  <h3 className="font-medium flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-blue-600" />
                    Adresse de ramassage
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm">
                      {announcement.pickupAddress}<br />
                      {announcement.pickupPostalCode} {announcement.pickupCity}<br />
                      {announcement.pickupCountry}
                    </p>
                    <p className="text-sm mt-2 flex items-center text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-1" />
                      Retrait prévu le {formatDate(announcement.pickupDate)}
                      {announcement.pickupDateFlexible && (
                        <span className="text-xs ml-1">(date flexible)</span>
                      )}
                    </p>
                  </div>
                </div>
                
                {/* Adresse de livraison */}
                <div className="space-y-4">
                  <h3 className="font-medium flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-red-600" />
                    Adresse de livraison
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm">
                      {announcement.deliveryAddress}<br />
                      {announcement.deliveryPostalCode} {announcement.deliveryCity}<br />
                      {announcement.deliveryCountry}
                    </p>
                    <p className="text-sm mt-2 flex items-center text-muted-foreground">
                      <Truck className="h-4 w-4 mr-1" />
                      Livraison flexible
                    </p>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* Informations sur le colis */}
              <div>
                <h3 className="font-medium flex items-center mb-3">
                  <Package className="h-4 w-4 mr-2" />
                  Informations sur le colis
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Taille</p>
                    <p className="font-medium">{announcement.packageSize}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Poids</p>
                    <p className="font-medium">{announcement.packageWeight} kg</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Contenu</p>
                    <p className="font-medium text-sm truncate">{announcement.packageContents}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Fragilité</p>
                    <p className="font-medium">{announcement.fragileContent ? 'Oui' : 'Non'}</p>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* Options supplémentaires */}
              <div>
                <h3 className="font-medium mb-3">Options supplémentaires</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Shield className={`h-5 w-5 ${announcement.insuranceOption !== 'NONE' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="text-sm font-medium">
                        Assurance: {
                          announcement.insuranceOption === 'NONE' ? 'Aucune' :
                          announcement.insuranceOption === 'BASIC' ? 'Basique' : 'Premium'
                        }
                      </p>
                      {announcement.insuranceOption !== 'NONE' && (
                        <p className="text-xs text-muted-foreground">
                          {announcement.insuranceOption === 'BASIC' ? 'Jusqu\'à 50€' : 'Jusqu\'à 500€'}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className={`h-5 w-5 ${announcement.requiresSignature ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="text-sm font-medium">
                        Signature à la livraison
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {announcement.requiresSignature ? 'Requise' : 'Non requise'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xl font-bold">
                    <span className="text-primary">
                      {announcement.price !== undefined 
                        ? `${typeof announcement.price === 'number' ? announcement.price.toFixed(2) : announcement.price} €` 
                        : 'Prix non défini'}
                    </span>
                    {announcement.isNegotiable && (
                      <Badge>Négociable</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Coordonnées */}
          <Card>
            <CardHeader>
              <CardTitle>Coordonnées</CardTitle>
              <CardDescription>Informations de contact pour cette livraison</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-3 flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Expéditeur
                  </h3>
                  <p className="text-sm">{announcement.senderName}</p>
                  <p className="text-sm mt-1">{announcement.senderPhone}</p>
                </div>
                
                <div>
                  <h3 className="font-medium mb-3 flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Destinataire
                  </h3>
                  <p className="text-sm">{announcement.recipientName}</p>
                  <p className="text-sm mt-1">{announcement.recipientPhone}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Historique des changements d'état */}
          <Card>
            <CardHeader>
              <CardTitle>Historique</CardTitle>
              <CardDescription>Suivi des changements d&apos;état de votre annonce</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative pl-8 space-y-6 before:absolute before:left-4 before:top-2 before:h-[calc(100%-16px)] before:w-0.5 before:bg-muted">
                {announcement.status === 'CANCELLED' && (
                  <div className="relative">
                    <div className="absolute left-[-30px] top-0 h-7 w-7 rounded-full bg-red-100 flex items-center justify-center">
                      <X className="h-4 w-4 text-red-600" />
                    </div>
                    <h3 className="font-medium text-sm">Annonce annulée</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(new Date())}
                    </p>
                  </div>
                )}
                
                {announcement.status === 'COMPLETED' && (
                  <>
                    <div className="relative">
                      <div className="absolute left-[-30px] top-0 h-7 w-7 rounded-full bg-green-100 flex items-center justify-center">
                        <Check className="h-4 w-4 text-green-600" />
                      </div>
                      <h3 className="font-medium text-sm">Livraison confirmée</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000))}
                      </p>
                    </div>
                    
                    <div className="relative">
                      <div className="absolute left-[-30px] top-0 h-7 w-7 rounded-full bg-amber-100 flex items-center justify-center">
                        <Truck className="h-4 w-4 text-amber-600" />
                      </div>
                      <h3 className="font-medium text-sm">En transit</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000))}
                      </p>
                    </div>
                  </>
                )}
                
                {announcement.status === 'IN_TRANSIT' && (
                  <div className="relative">
                    <div className="absolute left-[-30px] top-0 h-7 w-7 rounded-full bg-amber-100 flex items-center justify-center">
                      <Truck className="h-4 w-4 text-amber-600" />
                    </div>
                    <h3 className="font-medium text-sm">En transit</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000))}
                    </p>
                  </div>
                )}
                
                {(announcement.status === 'ASSIGNED' || announcement.status === 'IN_TRANSIT' || announcement.status === 'COMPLETED') && (
                  <div className="relative">
                    <div className="absolute left-[-30px] top-0 h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center">
                      <User className="h-4 w-4 text-indigo-600" />
                    </div>
                    <h3 className="font-medium text-sm">Offre acceptée</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {announcement.bids?.find(bid => bid.status === 'ACCEPTED')?.courierName || 'Un livreur'} a été assigné à votre annonce
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000))}
                    </p>
                  </div>
                )}
                
                <div className="relative">
                  <div className="absolute left-[-30px] top-0 h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center">
                    <Package className="h-4 w-4 text-blue-600" />
                  </div>
                  <h3 className="font-medium text-sm">Annonce publiée</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(announcement.createdAt)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="offers" className="space-y-6">
          {/* Offres */}
          <Card>
            <CardHeader>
              <CardTitle>Offres reçues</CardTitle>
              <CardDescription>
                {announcement.bids && announcement.bids.length > 0 
                  ? `${announcement.bids.length} offre(s) de livraison pour cette annonce` 
                  : "Aucune offre reçue pour le moment"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {announcement.bids && announcement.bids.length > 0 ? (
                  announcement.bids.map((bid) => (
                    <div key={bid.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>{bid.courierName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{bid.courierName}</p>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <span>★ {bid.courierRating?.toFixed(1)}</span>
                              <span className="mx-2">•</span>
                              <span>{new Date(bid.createdAt).toLocaleDateString('fr-FR')}</span>
                            </div>
                          </div>
                        </div>
                        <Badge>{bid.price.toFixed(2)} €</Badge>
                      </div>
                      {bid.message && (
                        <div className="mt-3 text-sm bg-gray-50 p-3 rounded-md">
                          {bid.message}
                        </div>
                      )}
                      <div className="mt-4 flex justify-end gap-2">
                        <Button variant="outline" size="sm">
                          <MessageSquare className="h-3.5 w-3.5 mr-1" />
                          Contacter
                        </Button>
                        
                        {bid.status === 'PENDING' && announcement.status === 'PUBLISHED' && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleRejectBid(bid.id)}
                              disabled={actionLoading}
                            >
                              <X className="h-3.5 w-3.5 mr-1" />
                              Refuser
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => {
                                setSelectedBidId(bid.id)
                                setIsAcceptDialogOpen(true)
                              }}
                              disabled={actionLoading}
                            >
                              <Check className="h-3.5 w-3.5 mr-1" />
                              Accepter l&apos;offre
                            </Button>
                          </>
                        )}
                        
                        {bid.status === 'ACCEPTED' && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Offre acceptée
                          </Badge>
                        )}
                        
                        {bid.status === 'REJECTED' && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            Offre refusée
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium">Aucune offre pour le moment</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Les livreurs pourront faire des offres sur votre annonce
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="messages" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
              <CardDescription>
                Communiquez directement avec {announcement.bids?.find(bid => bid.status === 'ACCEPTED')?.courierName || 'le livreur'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {messages.length > 0 ? (
                <div className="space-y-6">
                  <div className="h-[300px] pr-4 overflow-y-auto">
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div 
                          key={message.id}
                          className={`flex ${message.sender === 'client' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div 
                            className={`max-w-[80%] rounded-lg p-3 ${
                              message.sender === 'client' 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs mt-1 opacity-70">
                              {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Tapez votre message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      className="resize-none"
                      rows={2}
                      disabled={isSendingMessage}
                    />
                    <Button 
                      onClick={handleSendMessage} 
                      disabled={!messageText.trim() || isSendingMessage}
                      className="self-end"
                    >
                      Envoyer
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">Aucun message</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Démarrez la conversation avec le livreur
                  </p>
                  
                  <div className="mt-6 flex gap-2 max-w-md mx-auto">
                    <Textarea
                      placeholder="Tapez votre message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      className="resize-none"
                      rows={2}
                      disabled={isSendingMessage}
                    />
                    <Button 
                      onClick={handleSendMessage} 
                      disabled={!messageText.trim() || isSendingMessage}
                      className="self-end"
                    >
                      Envoyer
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="tracking" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Suivi en temps réel</CardTitle>
              <CardDescription>
                Suivez l&apos;avancement de votre livraison en temps réel
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(announcement.status === 'ASSIGNED' || announcement.status === 'IN_TRANSIT') ? (
                trackingData ? (
                  <div className="space-y-6">
                    <div className="aspect-video relative bg-gray-100 rounded-md overflow-hidden">
                      {/* Ici, dans une implémentation réelle, vous intégreriez Google Maps ou une autre API de cartographie */}
                      <div className="absolute inset-0 flex items-center justify-center bg-muted">
                        <div className="text-center space-y-2">
                          <Map className="h-12 w-12 text-muted-foreground mx-auto" />
                          <p className="text-muted-foreground">
                            Carte de suivi en temps réel
                          </p>
                        </div>
                      </div>
                      
                      {/* Points de départ et d'arrivée pour simuler la carte */}
                      <div className="absolute bottom-4 left-4 bg-primary/90 text-primary-foreground p-2 rounded text-sm flex items-center">
                        <MapPin className="h-4 w-4 mr-1 text-blue-300" />
                        {announcement.pickupCity}
                      </div>
                      <div className="absolute bottom-4 right-4 bg-primary/90 text-primary-foreground p-2 rounded text-sm flex items-center">
                        <MapPin className="h-4 w-4 mr-1 text-red-300" />
                        {announcement.deliveryCity}
                      </div>
                      
                      {/* Position du livreur simulée */}
                      <div className="absolute top-1/2 left-1/3 transform -translate-x-1/2 -translate-y-1/2">
                        <div className="relative">
                          <div className="h-6 w-6 bg-blue-500 rounded-full flex items-center justify-center text-white animate-pulse">
                            <Truck className="h-3 w-3" />
                          </div>
                          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-white px-2 py-0.5 rounded text-xs font-medium shadow-sm">
                            Livreur
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium mb-1">Statut actuel</h4>
                        <p className="text-sm">{trackingData.status}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium mb-1">Heure d&apos;arrivée estimée</h4>
                        <p className="text-sm">
                          {trackingData.estimatedArrival ? new Date(trackingData.estimatedArrival).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'Non disponible'}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium mb-1">Dernière mise à jour</h4>
                        <p className="text-sm">
                          {trackingData.lastUpdated ? new Date(trackingData.lastUpdated).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'Non disponible'}
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">Informations de contact du livreur</h4>
                      <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                        <Avatar>
                          <AvatarFallback>
                            {announcement.bids?.find(bid => bid.status === 'ACCEPTED')?.courierName.charAt(0) || 'L'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {announcement.bids?.find(bid => bid.status === 'ACCEPTED')?.courierName || 'Livreur'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            ★ {announcement.bids?.find(bid => bid.status === 'ACCEPTED')?.courierRating?.toFixed(1) || '4.5'} • ID: {announcement.bids?.find(bid => bid.status === 'ACCEPTED')?.courierId || 'C12345'}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" className="ml-auto">
                          <Phone className="h-4 w-4 mr-1" />
                          Appeler
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <Skeleton className="h-[400px] w-full rounded-md" />
                  </div>
                )
              ) : (
                <div className="text-center py-8">
                  <Map className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">Suivi non disponible</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Le suivi en temps réel sera disponible une fois que votre annonce aura été assignée à un livreur
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="stats" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Analyse de livraison</CardTitle>
              <CardDescription>
                Métriques et informations sur cette livraison
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Statistiques principales */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg flex flex-col items-center text-center">
                  <div className="bg-blue-100 p-2 rounded-full mb-2">
                    <Zap className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="text-xl font-bold">
                    {announcement.status === 'COMPLETED' ? '100%' : 
                     announcement.status === 'IN_TRANSIT' ? '75%' : 
                     announcement.status === 'ASSIGNED' ? '50%' : 
                     announcement.status === 'PUBLISHED' ? '25%' : '0%'}
                  </p>
                  <p className="text-sm text-muted-foreground">Progression</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg flex flex-col items-center text-center">
                  <div className="bg-amber-100 p-2 rounded-full mb-2">
                    <Clock2 className="h-5 w-5 text-amber-600" />
                  </div>
                  <p className="text-xl font-bold">
                    {announcement.status === 'COMPLETED' ? 
                      `${Math.floor(Math.random() * 5) + 1}j` : 
                      'En cours'}
                  </p>
                  <p className="text-sm text-muted-foreground">Durée totale</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg flex flex-col items-center text-center">
                  <div className="bg-green-100 p-2 rounded-full mb-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <p className="text-xl font-bold">
                    {announcement.bids?.length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Offres reçues</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg flex flex-col items-center text-center">
                  <div className="bg-indigo-100 p-2 rounded-full mb-2">
                    <MessageSquare className="h-5 w-5 text-indigo-600" />
                  </div>
                  <p className="text-xl font-bold">
                    {messages.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Messages</p>
                </div>
              </div>
              
              {/* Graphique de distance */}
              <div>
                <h3 className="font-medium mb-4">Distance et itinéraire</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center">
                      <div className="bg-blue-100 p-2 rounded-full mr-3">
                        <MapPin className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{announcement.pickupCity}</p>
                        <p className="text-xs text-muted-foreground">Point de départ</p>
                      </div>
                    </div>
                    
                    <div className="flex-1 mx-4 relative h-2">
                      <div className="absolute inset-0 bg-gray-200 rounded-full"></div>
                      <div className={`absolute inset-y-0 left-0 bg-blue-500 rounded-full ${
                        announcement.status === 'COMPLETED' ? 'right-0' : 
                        announcement.status === 'IN_TRANSIT' ? 'right-[25%]' : 
                        announcement.status === 'ASSIGNED' ? 'right-[75%]' : 'right-[95%]'
                      }`}></div>
                      
                      {announcement.status === 'IN_TRANSIT' && (
                        <div className="absolute top-[-4px] left-[75%] w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                      )}
                    </div>
                    
                    <div className="flex items-center">
                      <div className="bg-red-100 p-2 rounded-full mr-3">
                        <MapPin className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <p className="font-medium">{announcement.deliveryCity}</p>
                        <p className="text-xs text-muted-foreground">Destination</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm font-medium">Distance</p>
                      <p className="text-lg">465 km</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Durée estimée</p>
                      <p className="text-lg">4h20min</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Étapes</p>
                      <p className="text-lg">Direct</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Impact écologique */}
              <div>
                <h3 className="font-medium mb-4">Impact écologique</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <div className="bg-green-100 p-1.5 rounded-full mr-2">
                        <Truck className="h-4 w-4 text-green-600" />
                      </div>
                      <p className="font-medium text-sm">Réduction CO2</p>
                    </div>
                    <p className="text-xl font-bold text-green-700">- 75%</p>
                    <p className="text-xs text-muted-foreground mt-1">Par rapport à une livraison standard</p>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <div className="bg-green-100 p-1.5 rounded-full mr-2">
                        <Package className="h-4 w-4 text-green-600" />
                      </div>
                      <p className="font-medium text-sm">Livraison optimisée</p>
                    </div>
                    <p className="text-xl font-bold text-green-700">Mutualisation</p>
                    <p className="text-xs text-muted-foreground mt-1">Livraison combinée avec d&apos;autres colis</p>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <div className="bg-green-100 p-1.5 rounded-full mr-2">
                        <Calendar className="h-4 w-4 text-green-600" />
                      </div>
                      <p className="font-medium text-sm">Votre impact</p>
                    </div>
                    <p className="text-xl font-bold text-green-700">12 kg CO2 évités</p>
                    <p className="text-xs text-muted-foreground mt-1">Équivalent à 60 km en voiture</p>
                  </div>
                </div>
              </div>
              
              {/* Comparaison des prix */}
              {announcement.bids && announcement.bids.length > 0 && (
                <div>
                  <h3 className="font-medium mb-4">Analyse des offres</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="mb-4">
                      <p className="text-sm mb-1">Distribution des prix (€)</p>
                      <div className="relative h-8 bg-gray-200 rounded-lg">
                        {announcement.bids.map((bid, index) => (
                          <div 
                            key={bid.id}
                            className={`absolute h-full rounded-lg ${bid.status === 'ACCEPTED' ? 'bg-green-500' : 'bg-blue-500'}`}
                            style={{
                              left: `${index * (100 / announcement.bids.length)}%`,
                              width: `${100 / announcement.bids.length}%`,
                              opacity: 0.7 + (0.3 * (bid.price / announcement.price!))
                            }}
                          />
                        ))}
                        
                        {announcement.bids.map((bid) => (
                          <div 
                            key={`label-${bid.id}`}
                            className="absolute top-[-20px] text-xs"
                            style={{
                              left: `${announcement.bids!.indexOf(bid) * (100 / announcement.bids!.length) + (50 / announcement.bids!.length)}%`,
                              transform: 'translateX(-50%)'
                            }}
                          >
                            {bid.price}€
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-sm font-medium">Prix moyen</p>
                        <p className="text-lg">
                          {(announcement.bids.reduce((sum, bid) => sum + bid.price, 0) / announcement.bids.length).toFixed(2)}€
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Prix min</p>
                        <p className="text-lg">
                          {Math.min(...announcement.bids.map(bid => bid.price))}€
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Prix max</p>
                        <p className="text-lg">
                          {Math.max(...announcement.bids.map(bid => bid.price))}€
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Dialogue de confirmation d'annulation */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir annuler cette annonce ?</AlertDialogTitle>
            <AlertDialogDescription>
              L&apos;annonce ne sera plus visible par les livreurs et toutes les offres en cours seront rejetées.
              Cette action ne peut pas être annulée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleCancelAnnouncement()} 
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? 'Traitement...' : 'Confirmer l&apos;annulation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Dialogue de confirmation d'acceptation d'offre */}
      <AlertDialog open={isAcceptDialogOpen} onOpenChange={setIsAcceptDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accepter cette offre de livraison ?</AlertDialogTitle>
            <AlertDialogDescription>
              En acceptant cette offre, toutes les autres offres seront automatiquement refusées et le livreur sera assigné à votre annonce.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedBidId && handleAcceptBid(selectedBidId)} 
              disabled={actionLoading}
            >
              {actionLoading ? 'Traitement...' : 'Accepter l&apos;offre'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Dialogue pour signaler un problème */}
      <AlertDialog open={isReportProblemDialogOpen} onOpenChange={setIsReportProblemDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Signaler un problème avec cette livraison</AlertDialogTitle>
            <AlertDialogDescription>
              Décrivez le problème rencontré avec cette livraison. Un membre de notre équipe vous contactera dans les plus brefs délais.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-4 mb-4">
            <label className="block text-sm font-medium mb-2" htmlFor="problem">
              Description du problème
            </label>
            <textarea
              id="problem"
              className="w-full border rounded-md p-2 min-h-[100px]"
              placeholder="Décrivez le problème en détail..."
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
            ></textarea>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReportProblem} 
              disabled={!problemDescription.trim() || actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? 'Traitement...' : 'Envoyer le signalement'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Dialogue pour évaluer une livraison */}
      <AlertDialog open={isRateDeliveryDialogOpen} onOpenChange={setIsRateDeliveryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Évaluer cette livraison</AlertDialogTitle>
            <AlertDialogDescription>
              Partagez votre expérience avec ce livreur pour aider les autres utilisateurs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-4 mb-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Votre note
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="text-2xl focus:outline-none"
                    aria-label={`${star} étoiles`}
                  >
                    {star <= rating ? (
                      <span className="text-yellow-400">★</span>
                    ) : (
                      <span className="text-gray-300">★</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="review">
                Commentaire (optionnel)
              </label>
              <textarea
                id="review"
                className="w-full border rounded-md p-2 min-h-[100px]"
                placeholder="Partagez votre expérience avec ce livreur..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
              ></textarea>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRateDelivery} 
              disabled={actionLoading}
            >
              {actionLoading ? 'Traitement...' : 'Envoyer l\'évaluation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Dialogue pour partager l'annonce */}
      <AlertDialog>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Partager cette annonce</AlertDialogTitle>
            <AlertDialogDescription>
              Partagez cette annonce avec d&apos;autres personnes via différentes méthodes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button 
              variant="outline" 
              className="flex items-center gap-2 h-20 flex-col justify-center"
              onClick={() => {
                const subject = `Information sur la livraison: ${announcement.title}`;
                const body = `Bonjour,\n\nVoici les détails de ma livraison EcoDeli:\n\nID: ${announcement.id}\nTitre: ${announcement.title}\nStatut: ${statusConfig[announcement.status].label}\n\nDe: ${announcement.pickupCity}\nÀ: ${announcement.deliveryCity}\n\nConsultez les détails complets ici: ${window.location.href}`;
                window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
              }}
            >
              <Mail className="h-6 w-6" />
              <span>Email</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center gap-2 h-20 flex-col justify-center"
              onClick={() => {
                const text = `Livraison EcoDeli - ${announcement.title} - De: ${announcement.pickupCity} À: ${announcement.deliveryCity} - ${window.location.href}`;
                if (navigator.share) {
                  navigator.share({
                    title: announcement.title,
                    text: text,
                    url: window.location.href
                  });
                } else {
                  window.location.href = `sms:?body=${encodeURIComponent(text)}`;
                }
              }}
            >
              <MessageSquare className="h-6 w-6" />
              <span>SMS</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center gap-2 h-20 flex-col justify-center"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast({
                  title: "Lien copié",
                  description: "Le lien de l'annonce a été copié dans le presse-papier"
                });
              }}
            >
              <Copy className="h-6 w-6" />
              <span>Copier le lien</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center gap-2 h-20 flex-col justify-center"
              onClick={() => {
                toast({
                  title: "QR Code généré",
                  description: "Le QR Code a été téléchargé"
                });
              }}
            >
              <Download className="h-6 w-6" />
              <span>QR Code</span>
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Fermer</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Section imprimable - Récapitulatif/Bordereau */}
      <div id="print-section" className="hidden">
        <div className="p-8 max-w-4xl mx-auto">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl font-bold">Bordereau d&apos;expédition</h1>
              <p className="text-sm text-muted-foreground mt-1">EcoDeli - Livraison écologique</p>
            </div>
            <div className="text-right">
              <p className="font-medium">Référence: {announcement.id}</p>
              <p className="text-sm text-muted-foreground">Date: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
          
          <div className="border-t border-b py-4 my-6">
            <h2 className="font-medium mb-4">Détails de l&apos;annonce</h2>
            <div className="grid grid-cols-2 gap-y-3">
              <div>
                <p className="text-sm font-medium">Titre</p>
                <p className="text-sm">{announcement.title}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Statut</p>
                <p className="text-sm">{statusConfig[announcement.status].label}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Date de création</p>
                <p className="text-sm">{formatDate(announcement.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Prix</p>
                <p className="text-sm">{announcement.price?.toFixed(2)} €</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-8 mb-6">
            <div>
              <h2 className="font-medium mb-3">Adresse de ramassage</h2>
              <p className="text-sm">
                {announcement.pickupAddress}<br />
                {announcement.pickupPostalCode} {announcement.pickupCity}<br />
                {announcement.pickupCountry}
              </p>
              <p className="text-sm mt-2">
                Contact: {announcement.senderName} - {announcement.senderPhone}
              </p>
              <p className="text-sm mt-1">
                Date de ramassage: {formatDate(announcement.pickupDate)}
                {announcement.pickupDateFlexible && " (flexible)"}
              </p>
            </div>
            
            <div>
              <h2 className="font-medium mb-3">Adresse de livraison</h2>
              <p className="text-sm">
                {announcement.deliveryAddress}<br />
                {announcement.deliveryPostalCode} {announcement.deliveryCity}<br />
                {announcement.deliveryCountry}
              </p>
              <p className="text-sm mt-2">
                Contact: {announcement.recipientName} - {announcement.recipientPhone}
              </p>
            </div>
          </div>
          
          <div className="border-t pt-4 mb-6">
            <h2 className="font-medium mb-3">Information sur le colis</h2>
            <div className="grid grid-cols-2 gap-y-2">
              <div>
                <p className="text-sm font-medium">Taille</p>
                <p className="text-sm">{announcement.packageSize}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Poids</p>
                <p className="text-sm">{announcement.packageWeight} kg</p>
              </div>
              <div>
                <p className="text-sm font-medium">Contenu</p>
                <p className="text-sm">{announcement.packageContents}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Fragile</p>
                <p className="text-sm">{announcement.fragileContent ? 'Oui' : 'Non'}</p>
              </div>
            </div>
          </div>
          
          {announcement.status !== 'PUBLISHED' && announcement.bids?.find(bid => bid.status === 'ACCEPTED') && (
            <div className="border-t pt-4 mb-6">
              <h2 className="font-medium mb-3">Information sur le livreur</h2>
              <p className="text-sm">
                <span className="font-medium">Nom:</span> {announcement.bids?.find(bid => bid.status === 'ACCEPTED')?.courierName}
              </p>
              <p className="text-sm">
                <span className="font-medium">ID:</span> {announcement.bids?.find(bid => bid.status === 'ACCEPTED')?.courierId}
              </p>
              <p className="text-sm">
                <span className="font-medium">Prix de livraison:</span> {announcement.bids?.find(bid => bid.status === 'ACCEPTED')?.price.toFixed(2)} €
              </p>
            </div>
          )}
          
          <div className="text-center text-sm text-muted-foreground mt-8">
            <p>Ce document fait office de bordereau d&apos;expédition pour votre livraison EcoDeli.</p>
            <p className="mt-1">Pour toute question, contactez notre service client au 01 23 45 67 89.</p>
          </div>
        </div>
      </div>
      
      {/* Style d'impression */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-section, #print-section * {
            visibility: visible;
          }
          #print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
} 