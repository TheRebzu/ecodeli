"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Search, 
  Filter,
  RefreshCw,
  User,
  Mail,
  Phone,
  Calendar,
  Tag,
  ArrowRight,
  Eye,
  Reply,
  Archive,
  Trash2,
  Star,
  BarChart3,
  Users,
  TrendingUp,
  FileText
} from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";

export default function SupportPage() {
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Récupérer les tickets de support
  const { data: tickets, refetch } = api.adminSupport.getTickets.useQuery({
    priority: selectedPriority !== "all" ? selectedPriority : undefined,
    status: selectedStatus !== "all" ? selectedStatus : undefined,
    search: searchQuery || undefined,
    limit: 20
  });

  const { data: stats } = api.adminSupport.getSupportStats.useQuery({});

  // Mutations
  const updateTicketMutation = api.adminSupport.updateTicket.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Ticket mis à jour");
    }
  });

  const assignTicketMutation = api.adminSupport.assignTicket.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Ticket assigné");
    }
  });

  const priorityOptions = [
    { value: "LOW", label: "Faible", color: "bg-gray-100 text-gray-800" },
    { value: "MEDIUM", label: "Moyen", color: "bg-blue-100 text-blue-800" },
    { value: "HIGH", label: "Élevé", color: "bg-orange-100 text-orange-800" },
    { value: "URGENT", label: "Urgent", color: "bg-red-100 text-red-800" }
  ];

  const statusOptions = [
    { value: "OPEN", label: "Ouvert", color: "bg-green-100 text-green-800" },
    { value: "IN_PROGRESS", label: "En cours", color: "bg-blue-100 text-blue-800" },
    { value: "WAITING", label: "En attente", color: "bg-yellow-100 text-yellow-800" },
    { value: "RESOLVED", label: "Résolu", color: "bg-gray-100 text-gray-800" },
    { value: "CLOSED", label: "Fermé", color: "bg-gray-100 text-gray-800" }
  ];

  const categoryOptions = [
    { value: "TECHNICAL", label: "Technique", icon: "🔧" },
    { value: "BILLING", label: "Facturation", icon: "💳" },
    { value: "DELIVERY", label: "Livraison", icon: "📦" },
    { value: "ACCOUNT", label: "Compte", icon: "👤" },
    { value: "OTHER", label: "Autre", icon: "📝" }
  ];

  const getPriorityInfo = (priority: string) => {
    return priorityOptions.find(p => p.value === priority) || priorityOptions[0];
  };

  const getStatusInfo = (status: string) => {
    return statusOptions.find(s => s.value === status) || statusOptions[0];
  };

  const getCategoryInfo = (category: string) => {
    return categoryOptions.find(c => c.value === category) || categoryOptions[4];
  };

  const updateTicketStatus = (ticketId: string, status: string) => {
    updateTicketMutation.mutate({ id: ticketId, status });
  };

  const assignToMe = (ticketId: string) => {
    assignTicketMutation.mutate({ ticketId, assigneeId: "current-admin" });
  };

  return (
    <div className="container mx-auto py-6 max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Centre de support</h1>
          <p className="text-muted-foreground">
            Gestion des tickets et demandes d'assistance utilisateurs
          </p>
        </div>
        <Button onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tickets ouverts</p>
                <p className="text-2xl font-bold">{stats?.openTickets || 0}</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Temps de réponse</p>
                <p className="text-2xl font-bold">{stats?.avgResponseTime || "2h"}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taux de résolution</p>
                <p className="text-2xl font-bold">{stats?.resolutionRate || "94"}%</p>
              </div>
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Satisfaction</p>
                <p className="text-2xl font-bold">{stats?.satisfactionScore || "4.8"}/5</p>
              </div>
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <Star className="h-4 w-4 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tickets" className="space-y-6">
        <TabsList>
          <TabsTrigger value="tickets">Tickets de support</TabsTrigger>
          <TabsTrigger value="analytics">Analyses</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="space-y-6">
          {/* Filtres */}
          <Card>
            <CardHeader>
              <CardTitle>Filtres</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Recherche</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher dans les tickets..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Priorité</label>
                  <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les priorités</SelectItem>
                      {priorityOptions.map((priority) => (
                        <SelectItem key={priority.value} value={priority.value}>
                          {priority.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Statut</label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      {statusOptions.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Actions</label>
                  <Button variant="outline" className="w-full">
                    <Filter className="h-4 w-4 mr-2" />
                    Plus de filtres
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liste des tickets */}
          <Card>
            <CardHeader>
              <CardTitle>Tickets récents</CardTitle>
              <CardDescription>
                {tickets?.length || 0} ticket(s) trouvé(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tickets && tickets.length > 0 ? (
                  tickets.map((ticket: any) => (
                    <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="flex items-center space-x-2">
                          <Badge className={getPriorityInfo(ticket.priority).color}>
                            {getPriorityInfo(ticket.priority).label}
                          </Badge>
                          <Badge className={getStatusInfo(ticket.status).color}>
                            {getStatusInfo(ticket.status).label}
                          </Badge>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium truncate">{ticket.subject}</h3>
                            <span className="text-sm text-muted-foreground">
                              #{ticket.id.slice(-6)}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <User className="h-3 w-3" />
                              <span>{ticket.user?.name || "Utilisateur inconnu"}</span>
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              <Tag className="h-3 w-3" />
                              <span>{getCategoryInfo(ticket.category).icon} {getCategoryInfo(ticket.category).label}</span>
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{format(new Date(ticket.createdAt), 'dd MMM yyyy', { locale: fr })}</span>
                            </div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            {ticket.description}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {ticket.assignee && (
                          <Badge variant="outline" className="text-xs">
                            Assigné à {ticket.assignee.name}
                          </Badge>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => assignToMe(ticket.id)}
                          disabled={!!ticket.assignee}
                        >
                          <User className="h-4 w-4" />
                        </Button>
                        
                        <Select
                          value={ticket.status}
                          onValueChange={(value) => updateTicketStatus(ticket.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/support/${ticket.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        
                        <Button variant="ghost" size="sm">
                          <Reply className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Aucun ticket trouvé</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tickets par catégorie</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categoryOptions.map((category) => (
                    <div key={category.value} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">{category.icon}</span>
                        <span className="font-medium">{category.label}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">24</p>
                        <p className="text-sm text-muted-foreground">cette semaine</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance de l'équipe</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium">Agents actifs</span>
                    </div>
                    <span className="font-bold">5</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      </div>
                      <span className="font-medium">Tickets résolus aujourd'hui</span>
                    </div>
                    <span className="font-bold">18</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Clock className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="font-medium">Temps de réponse moyen</span>
                    </div>
                    <span className="font-bold">1h 23m</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="faq" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestion de la FAQ</CardTitle>
              <CardDescription>
                Articles d'aide et questions fréquemment posées
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4">
                <Button asChild>
                  <Link href="/admin/support/faq-management">
                    <FileText className="h-4 w-4 mr-2" />
                    Gérer la FAQ
                  </Link>
                </Button>
                
                <Button variant="outline">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Statistiques FAQ
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
