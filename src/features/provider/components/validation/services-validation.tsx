"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle,
  Clock,
  AlertCircle,
  Settings,
  DollarSign
} from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/hooks/use-api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ServicesValidationProps {
  providerId: string;
}

interface ProviderService {
  id: string;
  name: string;
  description: string;
  type: string;
  basePrice: number;
  priceUnit: string;
  duration?: number;
  isActive: boolean;
  validationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  validationNotes?: string;
  requirements: string[];
  minAdvanceBooking: number;
  maxAdvanceBooking: number;
  createdAt: string;
}

const SERVICE_TYPES = [
  { value: 'CLEANING', label: 'Ménage et nettoyage' },
  { value: 'GARDENING', label: 'Jardinage' },
  { value: 'BABYSITTING', label: 'Garde d\'enfants' },
  { value: 'PET_SITTING', label: 'Garde d\'animaux' },
  { value: 'TUTORING', label: 'Cours particuliers' },
  { value: 'HOME_REPAIR', label: 'Petits travaux' },
  { value: 'TRANSPORT', label: 'Transport de personnes' },
  { value: 'SHOPPING', label: 'Courses' },
  { value: 'OTHER', label: 'Autre' }
];

const PRICE_UNITS = [
  { value: 'HOUR', label: 'Par heure' },
  { value: 'FLAT', label: 'Forfait' },
  { value: 'KM', label: 'Par kilomètre' },
  { value: 'DAY', label: 'Par jour' }
];

export function ProviderServicesValidation({ providerId }: ServicesValidationProps) {
  const t = useTranslations("provider.validation.services");
  const { execute } = useApi();
  const [services, setServices] = useState<ProviderService[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingService, setEditingService] = useState<ProviderService | null>(null);

  // Créer les méthodes GET, POST et PUT basées sur execute
  const get = async (url: string) => {
    return await execute(url, { method: 'GET' });
  };

  const post = async (url: string, options: { body: string }) => {
    return await execute(url, { 
      method: 'POST',
      body: options.body,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  const put = async (url: string, options: { body: string }) => {
    return await execute(url, { 
      method: 'PUT',
      body: options.body,
      headers: { 'Content-Type': 'application/json' }
    });
  };
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "",
    basePrice: 0,
    priceUnit: "HOUR",
    duration: 60,
    isActive: true,
    requirements: [] as string[],
    minAdvanceBooking: 24,
    maxAdvanceBooking: 720
  });

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await get(`/api/provider/services?providerId=${providerId}`);
      if (response) {
        setServices(response.services || []);
      }
    } catch (error) {
      console.error("Error fetching services:", error);
      toast.error("Erreur lors du chargement des services");
    } finally {
      setLoading(false);
    }
  };

  const saveService = async () => {
    try {
      const endpoint = editingService 
        ? `/api/provider/services/${editingService.id}` 
        : "/api/provider/services";
      
      const method = editingService ? put : post;
      
      const response = await method(endpoint, {
        body: JSON.stringify({
          providerId,
          ...formData
        })
      });

      if (response) {
        toast.success(editingService ? "Service mis à jour" : "Service créé");
        setShowDialog(false);
        resetForm();
        fetchServices();
      }
    } catch (error) {
      console.error("Error saving service:", error);
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const requestValidation = async (serviceId: string) => {
    try {
      const response = await post(`/api/provider/services/${serviceId}/validate`, {
        body: JSON.stringify({ providerId })
      });

      if (response) {
        toast.success("Demande de validation envoyée");
        fetchServices();
      }
    } catch (error) {
      console.error("Error requesting validation:", error);
      toast.error("Erreur lors de la demande de validation");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      type: "",
      basePrice: 0,
      priceUnit: "HOUR",
      duration: 60,
      isActive: true,
      requirements: [],
      minAdvanceBooking: 24,
      maxAdvanceBooking: 720
    });
    setEditingService(null);
  };

  const editService = (service: ProviderService) => {
    setFormData({
      name: service.name,
      description: service.description,
      type: service.type,
      basePrice: service.basePrice,
      priceUnit: service.priceUnit,
      duration: service.duration || 60,
      isActive: service.isActive,
      requirements: service.requirements || [],
      minAdvanceBooking: service.minAdvanceBooking,
      maxAdvanceBooking: service.maxAdvanceBooking
    });
    setEditingService(service);
    setShowDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const config = {
      PENDING: { color: "bg-yellow-100 text-yellow-800", icon: Clock, label: "En attente" },
      APPROVED: { color: "bg-green-100 text-green-800", icon: CheckCircle, label: "Validé" },
      REJECTED: { color: "bg-red-100 text-red-800", icon: AlertCircle, label: "Rejeté" }
    };

    const statusConfig = config[status as keyof typeof config] || config.PENDING;
    const Icon = statusConfig.icon;

    return (
      <Badge className={statusConfig.color}>
        <Icon className="w-3 h-3 mr-1" />
        {statusConfig.label}
      </Badge>
    );
  };

  useEffect(() => {
    fetchServices();
  }, [providerId]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Services proposés</h3>
          <p className="text-gray-600">
            Définissez les types de prestations que vous souhaitez proposer
          </p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau service
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingService ? "Modifier le service" : "Nouveau service"}
              </DialogTitle>
              <DialogDescription>
                Définissez les caractéristiques de votre prestation
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nom du service</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Ménage à domicile"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type de service</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un type" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Décrivez en détail votre prestation..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="basePrice">Prix de base</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="basePrice"
                      type="number"
                      value={formData.basePrice}
                      onChange={(e) => setFormData({...formData, basePrice: parseFloat(e.target.value)})}
                      className="pl-10"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="priceUnit">Unité</Label>
                  <Select value={formData.priceUnit} onValueChange={(value) => setFormData({...formData, priceUnit: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRICE_UNITS.map((unit) => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="duration">Durée (min)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})}
                    placeholder="60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minAdvanceBooking">Réservation min (heures)</Label>
                  <Input
                    id="minAdvanceBooking"
                    type="number"
                    value={formData.minAdvanceBooking}
                    onChange={(e) => setFormData({...formData, minAdvanceBooking: parseInt(e.target.value)})}
                    placeholder="24"
                  />
                </div>
                <div>
                  <Label htmlFor="maxAdvanceBooking">Réservation max (heures)</Label>
                  <Input
                    id="maxAdvanceBooking"
                    type="number"
                    value={formData.maxAdvanceBooking}
                    onChange={(e) => setFormData({...formData, maxAdvanceBooking: parseInt(e.target.value)})}
                    placeholder="720"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
                />
                <Label>Service actif</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Annuler
              </Button>
              <Button onClick={saveService}>
                {editingService ? "Modifier" : "Créer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Services List */}
      {services.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Settings className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Aucun service configuré
              </h3>
              <p className="text-gray-600 mb-4">
                Commencez par ajouter les services que vous souhaitez proposer
              </p>
              <Button onClick={() => setShowDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter mon premier service
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services.map((service) => (
            <Card key={service.id} className="border-l-4 border-l-blue-500">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{service.name}</span>
                  {getStatusBadge(service.validationStatus)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">{service.description}</p>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="font-medium text-green-600">
                      {service.basePrice}€ {service.priceUnit === 'HOUR' ? '/h' : service.priceUnit === 'FLAT' ? 'forfait' : '/km'}
                    </span>
                    {service.duration && (
                      <span className="text-gray-500">{service.duration}min</span>
                    )}
                    <Badge variant={service.isActive ? "default" : "secondary"}>
                      {service.isActive ? "Actif" : "Inactif"}
                    </Badge>
                  </div>
                </div>

                {service.validationStatus === 'REJECTED' && service.validationNotes && (
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-sm text-red-800">
                      <strong>Motif de rejet:</strong> {service.validationNotes}
                    </p>
                  </div>
                )}

                <div className="flex justify-between">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => editService(service)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Modifier
                  </Button>

                  {service.validationStatus !== 'APPROVED' && (
                    <Button
                      size="sm"
                      onClick={() => requestValidation(service.id)}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Demander validation
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}