"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Eye,
  Edit,
  Download,
  Plus,
  Loader2
} from "lucide-react";
import { useTranslations } from "next-intl";

interface Intervention {
  id: string;
  title: string;
  description: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  type: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  client: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  location: {
    address: string;
    city: string;
    zipCode: string;
  };
  price: number;
  duration: number;
  notes?: string;
  completionReport?: string;
  rating?: number;
  createdAt: string;
  updatedAt: string;
}

interface InterventionManagerProps {
  providerId: string;
}

// Fonction utilitaire robuste pour formater la date
function formatDate(dateString: string) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function InterventionManager({ providerId }: InterventionManagerProps) {
  const t = useTranslations("provider.interventions");
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIntervention, setSelectedIntervention] = useState<Intervention | null>(null);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [completionReport, setCompletionReport] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    fetchInterventions();
  }, [providerId]);

  const fetchInterventions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/provider/interventions?providerId=${providerId}`);
      if (response.ok) {
        const data = await response.json();
        setInterventions(data.interventions || []);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des interventions:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateInterventionStatus = async (interventionId: string, status: string, report?: string) => {
    try {
      const response = await fetch(`/api/provider/interventions/${interventionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status,
          completionReport: report
        })
      });

      if (response.ok) {
        await fetchInterventions();
        setShowCompletionDialog(false);
        setCompletionReport("");
        setSelectedIntervention(null);
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      scheduled: { color: "bg-blue-100 text-blue-800", label: "Planifiée" },
      in_progress: { color: "bg-yellow-100 text-yellow-800", label: "En cours" },
      completed: { color: "bg-green-100 text-green-800", label: "Terminée" },
      cancelled: { color: "bg-red-100 text-red-800", label: "Annulée" }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getInterventionStats = () => {
    const total = interventions.length;
    const scheduled = interventions.filter(i => i.status === "scheduled").length;
    const inProgress = interventions.filter(i => i.status === "in_progress").length;
    const completed = interventions.filter(i => i.status === "completed").length;
    const cancelled = interventions.filter(i => i.status === "cancelled").length;
    
    const totalRevenue = interventions
      .filter(i => i.status === "completed")
      .reduce((sum, i) => sum + i.price, 0);

    return { total, scheduled, inProgress, completed, cancelled, totalRevenue };
  };

  const filteredInterventions = interventions.filter(intervention => {
    if (filterStatus === "all") return true;
    return intervention.status === filterStatus;
  });

  const stats = getInterventionStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Planifiées</p>
                <p className="text-2xl font-bold">{stats.scheduled}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">En cours</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Terminées</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">CA réalisé</p>
                <p className="text-2xl font-bold">{stats.totalRevenue}€</p>
              </div>
              <FileText className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les interventions</SelectItem>
            <SelectItem value="scheduled">Planifiées</SelectItem>
            <SelectItem value="in_progress">En cours</SelectItem>
            <SelectItem value="completed">Terminées</SelectItem>
            <SelectItem value="cancelled">Annulées</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Onglets par statut */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active">Actives</TabsTrigger>
          <TabsTrigger value="scheduled">Planifiées</TabsTrigger>
          <TabsTrigger value="completed">Terminées</TabsTrigger>
          <TabsTrigger value="all">Toutes</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>Interventions actives</CardTitle>
            </CardHeader>
            <CardContent>
              {interventions.filter(i => ["scheduled", "in_progress"].includes(i.status)).length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune intervention active</h3>
                  <p className="text-gray-600">Vos prochaines interventions apparaîtront ici.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {interventions
                    .filter(i => ["scheduled", "in_progress"].includes(i.status))
                    .map((intervention) => (
                      <InterventionCard 
                        key={intervention.id} 
                        intervention={intervention}
                        onStatusUpdate={updateInterventionStatus}
                        onViewDetails={setSelectedIntervention}
                        onCompleteIntervention={(intervention) => {
                          setSelectedIntervention(intervention);
                          setShowCompletionDialog(true);
                        }}
                      />
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled">
          <InterventionList 
            interventions={interventions.filter(i => i.status === "scheduled")}
            onStatusUpdate={updateInterventionStatus}
            onViewDetails={setSelectedIntervention}
            onCompleteIntervention={(intervention) => {
              setSelectedIntervention(intervention);
              setShowCompletionDialog(true);
            }}
          />
        </TabsContent>

        <TabsContent value="completed">
          <InterventionList 
            interventions={interventions.filter(i => i.status === "completed")}
            onStatusUpdate={updateInterventionStatus}
            onViewDetails={setSelectedIntervention}
            showCompletionReport
          />
        </TabsContent>

        <TabsContent value="all">
          <InterventionList 
            interventions={filteredInterventions}
            onStatusUpdate={updateInterventionStatus}
            onViewDetails={setSelectedIntervention}
            onCompleteIntervention={(intervention) => {
              setSelectedIntervention(intervention);
              setShowCompletionDialog(true);
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Dialog de finalisation d'intervention */}
      <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Finaliser l'intervention</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="report">Rapport de fin d'intervention</Label>
              <Textarea
                id="report"
                value={completionReport}
                onChange={(e) => setCompletionReport(e.target.value)}
                placeholder="Décrivez le travail effectué, les observations, etc."
                className="mt-1"
                rows={4}
              />
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setShowCompletionDialog(false)}>
                Annuler
              </Button>
              <Button 
                onClick={() => selectedIntervention && updateInterventionStatus(
                  selectedIntervention.id, 
                  "completed", 
                  completionReport
                )}
                disabled={!completionReport.trim()}
              >
                Finaliser
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de détails d'intervention */}
      {selectedIntervention && !showCompletionDialog && (
        <Dialog open={!!selectedIntervention} onOpenChange={() => setSelectedIntervention(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedIntervention.title}</DialogTitle>
            </DialogHeader>
            <InterventionDetails intervention={selectedIntervention} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface InterventionCardProps {
  intervention: Intervention;
  onStatusUpdate: (id: string, status: string, report?: string) => void;
  onViewDetails: (intervention: Intervention) => void;
  onCompleteIntervention?: (intervention: Intervention) => void;
}

function InterventionCard({ intervention, onStatusUpdate, onViewDetails, onCompleteIntervention }: InterventionCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-semibold text-lg">{intervention.title}</h3>
            <p className="text-gray-600">{intervention.description}</p>
          </div>
          {getStatusBadge(intervention.status)}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm">
              {formatDate(intervention.scheduledDate)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-sm">
              {intervention.startTime} - {intervention.endTime}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-500" />
            <span className="text-sm">{intervention.location.city}</span>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-500" />
            <span className="text-sm">{intervention.client.name}</span>
            <span className="text-lg font-semibold text-green-600">{intervention.price}€</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onViewDetails(intervention)}>
              <Eye className="h-4 w-4" />
            </Button>
            
            {['scheduled', 'confirmed'].includes(intervention.status) && (
              <Button 
                size="sm" 
                onClick={() => onStatusUpdate(intervention.id, "in_progress")}
              >
                Commencer
              </Button>
            )}
            
            {intervention.status === "in_progress" && onCompleteIntervention && (
              <Button 
                size="sm" 
                onClick={() => onCompleteIntervention(intervention)}
              >
                Terminer
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface InterventionListProps {
  interventions: Intervention[];
  onStatusUpdate: (id: string, status: string, report?: string) => void;
  onViewDetails: (intervention: Intervention) => void;
  onCompleteIntervention?: (intervention: Intervention) => void;
  showCompletionReport?: boolean;
}

function InterventionList({ 
  interventions, 
  onStatusUpdate, 
  onViewDetails, 
  onCompleteIntervention,
  showCompletionReport = false 
}: InterventionListProps) {
  if (interventions.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune intervention</h3>
          <p className="text-gray-600">Aucune intervention trouvée pour cette catégorie.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Intervention</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Prix</TableHead>
              {showCompletionReport && <TableHead>Rapport</TableHead>}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {interventions.map((intervention) => (
              <TableRow key={intervention.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{intervention.title}</div>
                    <div className="text-sm text-gray-500">{intervention.type}</div>
                  </div>
                </TableCell>
                <TableCell>{intervention.client.name}</TableCell>
                <TableCell>
                  {formatDate(intervention.scheduledDate)}
                </TableCell>
                <TableCell>{getStatusBadge(intervention.status)}</TableCell>
                <TableCell>{intervention.price}€</TableCell>
                {showCompletionReport && (
                  <TableCell>
                    {intervention.completionReport ? (
                      <span className="text-green-600">✓ Rapport disponible</span>
                    ) : (
                      <span className="text-gray-400">Aucun rapport</span>
                    )}
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => onViewDetails(intervention)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {intervention.status === "scheduled" && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => onStatusUpdate(intervention.id, "in_progress")}
                      >
                        Commencer
                      </Button>
                    )}
                    {intervention.status === "in_progress" && onCompleteIntervention && (
                      <Button 
                        size="sm" 
                        onClick={() => onCompleteIntervention(intervention)}
                      >
                        Terminer
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function InterventionDetails({ intervention }: { intervention: Intervention }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Type d'intervention</Label>
          <p className="font-medium">{intervention.type}</p>
        </div>
        <div>
          <Label>Durée prévue</Label>
          <p className="font-medium">{intervention.duration} minutes</p>
        </div>
      </div>

      <div>
        <Label>Description</Label>
        <p className="mt-1">{intervention.description}</p>
      </div>

      <div>
        <Label>Client</Label>
        <div className="mt-1">
          <p className="font-medium">{intervention.client.name}</p>
          <p className="text-sm text-gray-600">{intervention.client.email}</p>
          {intervention.client.phone && (
            <p className="text-sm text-gray-600">{intervention.client.phone}</p>
          )}
        </div>
      </div>

      <div>
        <Label>Adresse d'intervention</Label>
        <p className="mt-1">
          {intervention.location.address}<br />
          {intervention.location.zipCode} {intervention.location.city}
        </p>
      </div>

      {intervention.notes && (
        <div>
          <Label>Notes</Label>
          <p className="mt-1">{intervention.notes}</p>
        </div>
      )}

      {intervention.completionReport && (
        <div>
          <Label>Rapport de fin d'intervention</Label>
          <p className="mt-1 p-3 bg-gray-50 rounded">{intervention.completionReport}</p>
        </div>
      )}

      {intervention.rating && (
        <div>
          <Label>Évaluation client</Label>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-lg">{"★".repeat(intervention.rating)}{"☆".repeat(5-intervention.rating)}</span>
            <span className="text-sm text-gray-600">({intervention.rating}/5)</span>
          </div>
        </div>
      )}
    </div>
  );
}

function getStatusBadge(status: string) {
  const statusConfig = {
    scheduled: { color: "bg-blue-100 text-blue-800", label: "Planifiée" },
    in_progress: { color: "bg-yellow-100 text-yellow-800", label: "En cours" },
    completed: { color: "bg-green-100 text-green-800", label: "Terminée" },
    cancelled: { color: "bg-red-100 text-red-800", label: "Annulée" }
  };

  const config = statusConfig[status as keyof typeof statusConfig];
  return <Badge className={config.color}>{config.label}</Badge>;
}