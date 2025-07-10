"use client";

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  MessageCircle,
  Phone,
  Mail,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Plus,
  Send,
  Download,
  Star,
  Users,
  Headphones,
  BookOpen,
  HelpCircle,
  Zap,
  Settings,
  Loader2,
  ExternalLink
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

interface SupportTicket {
  id: string
  title: string
  description: string
  category: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed'
  createdAt: string
  updatedAt: string
  assignedTo?: {
    name: string
    avatar?: string
  }
  messages: Array<{
    id: string
    content: string
    sender: 'merchant' | 'support'
    senderName: string
    timestamp: string
    attachments?: Array<{
      name: string
      url: string
      size: number
    }>
  }>
}

interface KnowledgeBaseArticle {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  views: number
  helpful: number
  createdAt: string
  updatedAt: string
}

export default function MerchantSupportPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('tickets')
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [newTicketOpen, setNewTicketOpen] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchSupportData()
  }, [])

  const fetchSupportData = async () => {
    try {
      setLoading(true)
      const [ticketsRes, kbRes] = await Promise.all([
        fetch('/api/merchant/support/tickets', { credentials: 'include' }),
        fetch('/api/merchant/support/knowledge-base', { credentials: 'include' })
      ])
      
      if (ticketsRes.ok) {
        const ticketsData = await ticketsRes.json()
        setTickets(ticketsData.tickets || getDemoTickets())
      } else {
        setTickets(getDemoTickets())
      }

      if (kbRes.ok) {
        const kbData = await kbRes.json()
        setKnowledgeBase(kbData.articles || getDemoKnowledgeBase())
      } else {
        setKnowledgeBase(getDemoKnowledgeBase())
      }
    } catch (error) {
      console.error('Erreur chargement support:', error)
      setTickets(getDemoTickets())
      setKnowledgeBase(getDemoKnowledgeBase())
    } finally {
      setLoading(false)
    }
  }

  const getDemoTickets = (): SupportTicket[] => [
    {
      id: '1',
      title: 'Configuration du lâcher de chariot',
      description: 'J\'ai besoin d\'aide pour configurer les zones de livraison pour le service lâcher de chariot',
      category: 'Configuration',
      priority: 'medium',
      status: 'in_progress',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
      assignedTo: {
        name: 'Sophie Martin',
        avatar: undefined
      },
      messages: [
        {
          id: '1',
          content: 'Bonjour, j\'ai besoin d\'aide pour configurer les zones de livraison. Je ne comprends pas comment définir les tarifs par zone.',
          sender: 'merchant',
          senderName: 'Vous',
          timestamp: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: '2',
          content: 'Bonjour ! Je vais vous aider avec la configuration des zones. Avez-vous déjà défini vos codes postaux de livraison ?',
          sender: 'support',
          senderName: 'Sophie Martin',
          timestamp: new Date(Date.now() - 82800000).toISOString()
        }
      ]
    },
    {
      id: '2',
      title: 'Problème avec les paiements Stripe',
      description: 'Les paiements ne sont pas traités correctement depuis hier',
      category: 'Paiements',
      priority: 'high',
      status: 'open',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      updatedAt: new Date(Date.now() - 7200000).toISOString(),
      messages: [
        {
          id: '1',
          content: 'Depuis hier, les paiements Stripe ne fonctionnent plus. Les clients reçoivent des erreurs lors du checkout.',
          sender: 'merchant',
          senderName: 'Vous',
          timestamp: new Date(Date.now() - 7200000).toISOString()
        }
      ]
    }
  ]

  const getDemoKnowledgeBase = (): KnowledgeBaseArticle[] => [
    {
      id: '1',
      title: 'Comment configurer le service lâcher de chariot',
      content: 'Le service lâcher de chariot est le service phare d\'EcoDeli. Voici comment le configurer...',
      category: 'Configuration',
      tags: ['lâcher de chariot', 'configuration', 'zones'],
      views: 1247,
      helpful: 89,
      createdAt: new Date(Date.now() - 2592000000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: '2',
      title: 'Intégration avec votre système POS',
      content: 'Pour connecter votre caisse avec EcoDeli, suivez ces étapes...',
      category: 'Intégrations',
      tags: ['POS', 'caisse', 'intégration'],
      views: 892,
      helpful: 76,
      createdAt: new Date(Date.now() - 1728000000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: '3',
      title: 'Comprendre vos commissions EcoDeli',
      content: 'Voici comment sont calculées vos commissions et comment optimiser vos revenus...',
      category: 'Facturation',
      tags: ['commissions', 'facturation', 'revenus'],
      views: 634,
      helpful: 58,
      createdAt: new Date(Date.now() - 1296000000).toISOString(),
      updatedAt: new Date(Date.now() - 172800000).toISOString()
    }
  ]

  const handleCreateTicket = async (formData: any) => {
    try {
      setSending(true)
      const response = await fetch('/api/merchant/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const newTicket = await response.json()
        setTickets(prev => [newTicket, ...prev])
        setNewTicketOpen(false)
      }
    } catch (error) {
      console.error('Erreur création ticket:', error)
    } finally {
      setSending(false)
    }
  }

  const handleSendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return

    try {
      setSending(true)
      const response = await fetch(`/api/merchant/support/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: newMessage })
      })

      if (response.ok) {
        const newMsg = await response.json()
        setSelectedTicket(prev => prev ? {
          ...prev,
          messages: [...prev.messages, newMsg]
        } : null)
        setNewMessage('')
      }
    } catch (error) {
      console.error('Erreur envoi message:', error)
    } finally {
      setSending(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      open: { variant: 'secondary' as const, text: 'Ouvert', icon: AlertCircle },
      in_progress: { variant: 'default' as const, text: 'En cours', icon: Clock },
      waiting: { variant: 'outline' as const, text: 'En attente', icon: Clock },
      resolved: { variant: 'default' as const, text: 'Résolu', icon: CheckCircle },
      closed: { variant: 'outline' as const, text: 'Fermé', icon: CheckCircle }
    }
    return variants[status as keyof typeof variants] || variants.open
  }

  const getPriorityBadge = (priority: string) => {
    const variants = {
      low: { variant: 'outline' as const, text: 'Faible', color: 'text-green-600' },
      medium: { variant: 'secondary' as const, text: 'Moyenne', color: 'text-yellow-600' },
      high: { variant: 'destructive' as const, text: 'Haute', color: 'text-orange-600' },
      urgent: { variant: 'destructive' as const, text: 'Urgente', color: 'text-red-600' }
    }
    return variants[priority as keyof typeof variants] || variants.medium
  }

  const filteredTickets = tickets.filter(ticket =>
    ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredKB = knowledgeBase.filter(article =>
    article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement du support...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Support & Assistance</h1>
          <p className="text-muted-foreground">
            Support dédié aux commerçants EcoDeli - Nous sommes là pour vous aider
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" asChild>
            <a href="tel:+33142567890">
              <Phone className="h-4 w-4 mr-2" />
              01 42 56 78 90
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="mailto:support-merchants@ecodeli.fr">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </a>
          </Button>
        </div>
      </div>

      {/* Contact rapide */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-4 text-center">
            <Phone className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <h3 className="font-medium">Support téléphonique</h3>
            <p className="text-sm text-muted-foreground mb-2">Lun-Ven 9h-18h</p>
            <Button variant="outline" size="sm" asChild>
              <a href="tel:+33142567890">01 42 56 78 90</a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <MessageCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <h3 className="font-medium">Chat en direct</h3>
            <p className="text-sm text-muted-foreground mb-2">Réponse immédiate</p>
            <Button variant="outline" size="sm">
              <MessageCircle className="h-4 w-4 mr-2" />
              Démarrer le chat
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 text-purple-500 mx-auto mb-2" />
            <h3 className="font-medium">Account Manager</h3>
            <p className="text-sm text-muted-foreground mb-2">Support personnalisé</p>
            <Button variant="outline" size="sm">
              <Users className="h-4 w-4 mr-2" />
              Contacter mon AM
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full max-w-lg grid-cols-4">
            <TabsTrigger value="tickets">Mes tickets</TabsTrigger>
            <TabsTrigger value="knowledge">Base de connaissances</TabsTrigger>
            <TabsTrigger value="training">Formation</TabsTrigger>
            <TabsTrigger value="status">État des services</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </div>

        <TabsContent value="tickets" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Mes tickets de support</h2>
            <Dialog open={newTicketOpen} onOpenChange={setNewTicketOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau ticket
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Créer un ticket de support</DialogTitle>
                  <DialogDescription>
                    Décrivez votre problème en détail pour recevoir une aide personnalisée
                  </DialogDescription>
                </DialogHeader>
                <NewTicketForm 
                  onSubmit={handleCreateTicket}
                  sending={sending}
                  onCancel={() => setNewTicketOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Liste des tickets */}
            <div className="space-y-4">
              {filteredTickets.map((ticket) => {
                const statusBadge = getStatusBadge(ticket.status)
                const priorityBadge = getPriorityBadge(ticket.priority)
                const StatusIcon = statusBadge.icon

                return (
                  <Card 
                    key={ticket.id} 
                    className={`cursor-pointer transition-colors ${
                      selectedTicket?.id === ticket.id ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{ticket.title}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {ticket.description}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1 ml-2">
                          <Badge variant={statusBadge.variant} className="text-xs">
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusBadge.text}
                          </Badge>
                          <Badge variant={priorityBadge.variant} className="text-xs">
                            {priorityBadge.text}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>#{ticket.id} • {ticket.category}</span>
                        <span>{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                      </div>
                      {ticket.assignedTo && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium">
                              {ticket.assignedTo.name.charAt(0)}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            Assigné à {ticket.assignedTo.name}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}

              {filteredTickets.length === 0 && (
                <Card className="text-center py-12">
                  <CardContent>
                    <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Aucun ticket trouvé</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm ? 'Aucun ticket ne correspond à votre recherche' : 'Vous n\'avez aucun ticket de support'}
                    </p>
                    {!searchTerm && (
                      <Button onClick={() => setNewTicketOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Créer votre premier ticket
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Détails du ticket sélectionné */}
            <div>
              {selectedTicket ? (
                <Card className="h-fit">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{selectedTicket.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Ticket #{selectedTicket.id} • {selectedTicket.category}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Badge variant={getStatusBadge(selectedTicket.status).variant}>
                          {getStatusBadge(selectedTicket.status).text}
                        </Badge>
                        <Badge variant={getPriorityBadge(selectedTicket.priority).variant}>
                          {getPriorityBadge(selectedTicket.priority).text}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Messages */}
                    <div className="max-h-96 overflow-y-auto space-y-4">
                      {selectedTicket.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender === 'merchant' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] p-3 rounded-lg ${
                              message.sender === 'merchant'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium">{message.senderName}</span>
                              <span className="text-xs opacity-70">
                                {new Date(message.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm">{message.content}</p>
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {message.attachments.map((attachment, index) => (
                                  <div key={index} className="flex items-center gap-2 text-xs">
                                    <FileText className="h-3 w-3" />
                                    <span>{attachment.name}</span>
                                    <Button variant="ghost" size="sm" asChild>
                                      <a href={attachment.url} download>
                                        <Download className="h-3 w-3" />
                                      </a>
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Nouveau message */}
                    {selectedTicket.status !== 'closed' && (
                      <div className="border-t pt-4">
                        <div className="flex gap-2">
                          <Textarea
                            placeholder="Tapez votre message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            className="flex-1"
                            rows={2}
                          />
                          <Button
                            onClick={handleSendMessage}
                            disabled={!newMessage.trim() || sending}
                            size="sm"
                          >
                            {sending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="h-96 flex items-center justify-center">
                  <CardContent className="text-center">
                    <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Sélectionnez un ticket</h3>
                    <p className="text-muted-foreground">
                      Choisissez un ticket dans la liste pour voir les détails et conversations
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="knowledge" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredKB.map((article) => (
              <Card key={article.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base line-clamp-2">{article.title}</CardTitle>
                      <Badge variant="outline" className="mt-2 text-xs">
                        {article.category}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {article.content}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                    <span>{article.views} vues</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-current text-yellow-500" />
                      <span>{article.helpful}% utile</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {article.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    Lire l'article
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredKB.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucun article trouvé</h3>
                <p className="text-muted-foreground">
                  Aucun article ne correspond à votre recherche
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="training" className="space-y-6">
          <TrainingSection />
        </TabsContent>

        <TabsContent value="status" className="space-y-6">
          <ServiceStatusSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Composant pour le formulaire de nouveau ticket
interface NewTicketFormProps {
  onSubmit: (data: any) => void
  sending: boolean
  onCancel: () => void
}

function NewTicketForm({ onSubmit, sending, onCancel }: NewTicketFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Titre du problème *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Décrivez brièvement votre problème"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Catégorie *</Label>
        <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionnez une catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Configuration">Configuration</SelectItem>
            <SelectItem value="Paiements">Paiements</SelectItem>
            <SelectItem value="Livraisons">Livraisons</SelectItem>
            <SelectItem value="Intégrations">Intégrations</SelectItem>
            <SelectItem value="Facturation">Facturation</SelectItem>
            <SelectItem value="Technique">Problème technique</SelectItem>
            <SelectItem value="Autre">Autre</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="priority">Priorité</Label>
        <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Faible</SelectItem>
            <SelectItem value="medium">Moyenne</SelectItem>
            <SelectItem value="high">Haute</SelectItem>
            <SelectItem value="urgent">Urgente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description détaillée *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Décrivez votre problème en détail..."
          rows={4}
          required
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={sending || !formData.title || !formData.description || !formData.category}>
          {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Créer le ticket
        </Button>
      </DialogFooter>
    </form>
  )
}

// Section Formation
function TrainingSection() {
  const trainings = [
    {
      title: 'Démarrage avec EcoDeli',
      description: 'Guide complet pour configurer votre compte commerçant',
      duration: '15 min',
      completed: true,
      category: 'Bases'
    },
    {
      title: 'Maîtriser le lâcher de chariot',
      description: 'Optimisez le service phare d\'EcoDeli pour votre magasin',
      duration: '25 min',
      completed: false,
      category: 'Service'
    },
    {
      title: 'Intégrations POS avancées',
      description: 'Connectez votre caisse avec EcoDeli',
      duration: '20 min',
      completed: false,
      category: 'Technique'
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Formation commerçants</h2>
        <p className="text-muted-foreground">
          Modules de formation pour maîtriser la plateforme EcoDeli
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trainings.map((training, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{training.title}</CardTitle>
                  <Badge variant="outline" className="mt-2">
                    {training.category}
                  </Badge>
                </div>
                {training.completed && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {training.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 inline mr-1" />
                  {training.duration}
                </span>
                <Button size="sm" variant={training.completed ? "outline" : "default"}>
                  {training.completed ? 'Revoir' : 'Commencer'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Section État des services
function ServiceStatusSection() {
  const services = [
    { name: 'API EcoDeli', status: 'operational', uptime: '99.9%' },
    { name: 'Paiements Stripe', status: 'operational', uptime: '99.8%' },
    { name: 'Notifications OneSignal', status: 'operational', uptime: '99.7%' },
    { name: 'Interface commerçant', status: 'operational', uptime: '99.9%' },
    { name: 'Matching livreurs', status: 'degraded', uptime: '97.2%' }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'text-green-500'
      case 'degraded': return 'text-yellow-500'
      case 'down': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'operational': return 'Opérationnel'
      case 'degraded': return 'Dégradé'
      case 'down': return 'Indisponible'
      default: return 'Inconnu'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">État des services EcoDeli</h2>
        <p className="text-muted-foreground">
          Statut en temps réel de tous les services EcoDeli
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Services système</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {services.map((service, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${
                    service.status === 'operational' ? 'bg-green-500' :
                    service.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  <span className="font-medium">{service.name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className={getStatusColor(service.status)}>
                    {getStatusText(service.status)}
                  </span>
                  <span className="text-muted-foreground">
                    {service.uptime} uptime
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Alert>
        <Zap className="h-4 w-4" />
        <AlertDescription>
          <strong>Info maintenance :</strong> Maintenance programmée ce dimanche de 2h à 4h pour améliorer les performances.
        </AlertDescription>
      </Alert>
    </div>
  )
} 