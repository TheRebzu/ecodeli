"use client"

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { PageHeader } from '@/components/layout/page-header'
import { 
  HelpCircle, 
  MessageSquare, 
  Phone, 
  Mail, 
  Plus,
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageCircle
} from 'lucide-react'

interface SupportTicket {
  id: string
  subject: string
  category: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'waiting_response' | 'resolved' | 'closed'
  description: string
  createdAt: string
  updatedAt: string
  lastResponse?: string
  responseCount: number
}

interface FAQItem {
  id: string
  category: string
  question: string
  answer: string
  isPopular: boolean
  helpfulCount: number
}

const faqData: FAQItem[] = [
  {
    id: '1',
    category: 'Livraisons',
    question: 'Comment suivre ma livraison en temps réel ?',
    answer: 'Rendez-vous dans la section "Suivi en temps réel" de votre tableau de bord. Vous pourrez voir la position GPS de votre livreur et recevoir des notifications push.',
    isPopular: true,
    helpfulCount: 127
  },
  {
    id: '2',
    category: 'Paiements',
    question: 'Quels moyens de paiement sont acceptés ?',
    answer: 'Nous acceptons les cartes bancaires (Visa, Mastercard), PayPal, et les virements SEPA. Tous les paiements sont sécurisés par Stripe.',
    isPopular: true,
    helpfulCount: 89
  },
  {
    id: '3',
    category: 'Services',
    question: 'Comment réserver un service à la personne ?',
    answer: 'Allez dans "Services", choisissez votre catégorie, sélectionnez un prestataire et réservez un créneau. Vous recevrez une confirmation par email.',
    isPopular: false,
    helpfulCount: 45
  },
  {
    id: '4',
    category: 'Stockage',
    question: 'Comment louer une box de stockage ?',
    answer: 'Dans la section "Stockage", consultez les box disponibles près de chez vous, choisissez la taille adaptée et procédez à la réservation.',
    isPopular: false,
    helpfulCount: 32
  },
  {
    id: '5',
    category: 'Compte',
    question: 'Comment modifier mes informations personnelles ?',
    answer: 'Allez dans "Mon Profil", cliquez sur "Modifier" et mettez à jour vos informations. N\'oubliez pas de sauvegarder.',
    isPopular: true,
    helpfulCount: 156
  }
]

const ticketCategories = [
  { value: 'delivery', label: 'Problème de livraison' },
  { value: 'service', label: 'Question sur un service' },
  { value: 'payment', label: 'Problème de paiement' },
  { value: 'account', label: 'Compte utilisateur' },
  { value: 'technical', label: 'Problème technique' },
  { value: 'other', label: 'Autre' }
]

const priorityLevels = [
  { value: 'low', label: 'Faible', color: 'bg-gray-100 text-gray-800' },
  { value: 'medium', label: 'Moyenne', color: 'bg-blue-100 text-blue-800' },
  { value: 'high', label: 'Élevée', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgente', color: 'bg-red-100 text-red-800' }
]

export default function ClientSupportPage() {
  const { user } = useAuth()
  const t = useTranslations('client.support')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null)
  const [showTicketForm, setShowTicketForm] = useState(false)
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: '',
    priority: 'medium',
    description: ''
  })

  const filteredFAQ = faqData.filter(item => {
    const matchesSearch = !searchTerm || 
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = selectedCategory === 'all' || 
      item.category.toLowerCase() === selectedCategory.toLowerCase()
    
    return matchesSearch && matchesCategory
  })

  const handleCreateTicket = async () => {
    try {
      const response = await fetch('/api/client/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...ticketForm,
          clientId: user?.id
        })
      })

      if (response.ok) {
        setShowTicketForm(false)
        setTicketForm({
          subject: '',
          category: '',
          priority: 'medium',
          description: ''
        })
        // Reload tickets
      }
    } catch (error) {
      console.error('Error creating ticket:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const config = {
      open: { label: 'Ouvert', color: 'bg-green-100 text-green-800' },
      in_progress: { label: 'En cours', color: 'bg-blue-100 text-blue-800' },
      waiting_response: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
      resolved: { label: 'Résolu', color: 'bg-purple-100 text-purple-800' },
      closed: { label: 'Fermé', color: 'bg-gray-100 text-gray-800' }
    }
    
    const statusConfig = config[status as keyof typeof config]
    return <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
  }

  const getPriorityBadge = (priority: string) => {
    const config = priorityLevels.find(p => p.value === priority)
    return <Badge className={config?.color || 'bg-gray-100 text-gray-800'}>{config?.label}</Badge>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Centre d'aide"
        description="Trouvez des réponses ou contactez notre équipe support"
      />

      {/* Contact rapide */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <Phone className="w-8 h-8 mx-auto text-blue-600 mb-3" />
            <h3 className="font-semibold mb-2">Appelez-nous</h3>
            <p className="text-sm text-gray-600 mb-3">Du lundi au vendredi<br />9h - 18h</p>
            <Button variant="outline" size="sm">
              01 23 45 67 89
            </Button>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <MessageCircle className="w-8 h-8 mx-auto text-green-600 mb-3" />
            <h3 className="font-semibold mb-2">Chat en direct</h3>
            <p className="text-sm text-gray-600 mb-3">Réponse immédiate<br />7j/7, 24h/24</p>
            <Button size="sm">
              Démarrer le chat
            </Button>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <Mail className="w-8 h-8 mx-auto text-purple-600 mb-3" />
            <h3 className="font-semibold mb-2">Email</h3>
            <p className="text-sm text-gray-600 mb-3">Réponse sous 24h<br />support@ecodeli.fr</p>
            <Button variant="outline" size="sm">
              Envoyer un email
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="faq" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="faq">
            <HelpCircle className="w-4 h-4 mr-2" />
            FAQ
          </TabsTrigger>
          <TabsTrigger value="tickets">
            <MessageSquare className="w-4 h-4 mr-2" />
            Mes tickets ({tickets.length})
          </TabsTrigger>
          <TabsTrigger value="guides">
            <ExternalLink className="w-4 h-4 mr-2" />
            Guides
          </TabsTrigger>
        </TabsList>

        <TabsContent value="faq" className="space-y-6">
          {/* Recherche FAQ */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Rechercher dans la FAQ..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Toutes les catégories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les catégories</SelectItem>
                    <SelectItem value="livraisons">Livraisons</SelectItem>
                    <SelectItem value="paiements">Paiements</SelectItem>
                    <SelectItem value="services">Services</SelectItem>
                    <SelectItem value="stockage">Stockage</SelectItem>
                    <SelectItem value="compte">Compte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Questions populaires */}
          <Card>
            <CardHeader>
              <CardTitle>Questions les plus populaires</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredFAQ
                .filter(item => item.isPopular)
                .slice(0, 3)
                .map(item => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <button
                      onClick={() => setExpandedFAQ(expandedFAQ === item.id ? null : item.id)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <span className="font-medium">{item.question}</span>
                      {expandedFAQ === item.id ? 
                        <ChevronUp className="w-4 h-4" /> : 
                        <ChevronDown className="w-4 h-4" />
                      }
                    </button>
                    
                    {expandedFAQ === item.id && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-gray-700 mb-3">{item.answer}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>👍 {item.helpfulCount} personnes ont trouvé cela utile</span>
                          <Badge variant="secondary">{item.category}</Badge>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </CardContent>
          </Card>

          {/* Toutes les questions */}
          <Card>
            <CardHeader>
              <CardTitle>Toutes les questions ({filteredFAQ.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredFAQ.map(item => (
                <div key={item.id} className="border rounded-lg p-4">
                  <button
                    onClick={() => setExpandedFAQ(expandedFAQ === item.id ? null : item.id)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{item.question}</span>
                      {item.isPopular && <Badge variant="outline">Populaire</Badge>}
                    </div>
                    {expandedFAQ === item.id ? 
                      <ChevronUp className="w-4 h-4" /> : 
                      <ChevronDown className="w-4 h-4" />
                    }
                  </button>
                  
                  {expandedFAQ === item.id && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-gray-700 mb-3">{item.answer}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>👍 {item.helpfulCount} personnes ont trouvé cela utile</span>
                        <Badge variant="secondary">{item.category}</Badge>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {filteredFAQ.length === 0 && (
                <div className="text-center py-8">
                  <Search className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Aucune question trouvée</h3>
                  <p className="text-gray-600">Essayez de modifier votre recherche</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets" className="space-y-6">
          {/* Créer un ticket */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Mes demandes de support</h3>
            <Dialog open={showTicketForm} onOpenChange={setShowTicketForm}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle demande
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Créer une demande de support</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Sujet</label>
                    <Input
                      value={ticketForm.subject}
                      onChange={(e) => setTicketForm({...ticketForm, subject: e.target.value})}
                      placeholder="Décrivez brièvement votre problème"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Catégorie</label>
                      <Select value={ticketForm.category} onValueChange={(value) => setTicketForm({...ticketForm, category: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir une catégorie" />
                        </SelectTrigger>
                        <SelectContent>
                          {ticketCategories.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Priorité</label>
                      <Select value={ticketForm.priority} onValueChange={(value) => setTicketForm({...ticketForm, priority: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {priorityLevels.map(level => (
                            <SelectItem key={level.value} value={level.value}>
                              {level.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Description détaillée</label>
                    <Textarea
                      value={ticketForm.description}
                      onChange={(e) => setTicketForm({...ticketForm, description: e.target.value})}
                      placeholder="Décrivez votre problème en détail..."
                      rows={4}
                    />
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleCreateTicket}>
                      Créer le ticket
                    </Button>
                    <Button variant="outline" onClick={() => setShowTicketForm(false)}>
                      Annuler
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Liste des tickets */}
          <div className="space-y-4">
            {tickets.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <MessageSquare className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Aucune demande de support</h3>
                  <p className="text-gray-600 mb-4">Vous n'avez pas encore créé de ticket de support</p>
                  <Button onClick={() => setShowTicketForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Créer ma première demande
                  </Button>
                </CardContent>
              </Card>
            ) : (
              tickets.map(ticket => (
                <Card key={ticket.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold">{ticket.subject}</h4>
                          {getStatusBadge(ticket.status)}
                          {getPriorityBadge(ticket.priority)}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">
                          Ticket #{ticket.id.slice(-8)} • {ticketCategories.find(c => c.value === ticket.category)?.label}
                        </p>
                        
                        <p className="text-gray-700 line-clamp-2 mb-3">
                          {ticket.description}
                        </p>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Créé le {new Date(ticket.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {ticket.responseCount} réponse(s)
                          </span>
                        </div>
                      </div>
                      
                      <Button variant="outline" size="sm">
                        Voir le détail
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="guides" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Guide de démarrage",
                description: "Apprenez à utiliser EcoDeli en 5 étapes simples",
                icon: "🚀",
                link: "/guides/getting-started"
              },
              {
                title: "Créer sa première annonce",
                description: "Tutorial complet pour publier votre première demande",
                icon: "📦",
                link: "/guides/first-announcement"
              },
              {
                title: "Système de paiement",
                description: "Comprendre les paiements et la facturation",
                icon: "💳",
                link: "/guides/payments"
              },
              {
                title: "Services à la personne",
                description: "Comment réserver et gérer vos services",
                icon: "👥",
                link: "/guides/services"
              },
              {
                title: "Stockage et box",
                description: "Louer et gérer vos espaces de stockage",
                icon: "📦",
                link: "/guides/storage"
              },
              {
                title: "Sécurité et confidentialité",
                description: "Protéger vos données et utiliser EcoDeli en sécurité",
                icon: "🔒",
                link: "/guides/security"
              }
            ].map((guide, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="text-4xl mb-4">{guide.icon}</div>
                  <h3 className="font-semibold mb-2">{guide.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{guide.description}</p>
                  <Button variant="outline" size="sm" className="w-full">
                    <ExternalLink className="w-3 h-3 mr-2" />
                    Lire le guide
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}