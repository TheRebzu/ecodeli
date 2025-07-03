"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  DollarSign, 
  Edit, 
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Handshake
} from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/hooks/use-api";
import { useAuth } from "@/hooks/use-auth";
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

interface ProviderRate {
  id: string;
  serviceType: string;
  baseRate: number;
  proposedRate: number;
  negotiatedRate?: number;
  unitType: string;
  minimumCharge?: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEGOTIATION';
  adminNotes?: string;
  providerNotes?: string;
  lastModified: string;
  approvedAt?: string;
  commission: number;
  netRate: number;
}

interface ServiceTypeRate {
  type: string;
  name: string;
  suggestedRate: number;
  minRate: number;
  maxRate: number;
  unit: string;
  description: string;
  commission: number;
}

const SERVICE_RATES: ServiceTypeRate[] = [
  {
    type: 'CLEANING',
    name: 'Ménage et nettoyage',
    suggestedRate: 15,
    minRate: 12,
    maxRate: 25,
    unit: 'HOUR',
    description: 'Taux horaire pour les services de ménage à domicile',
    commission: 0.15
  },
  {
    type: 'GARDENING',
    name: 'Jardinage',
    suggestedRate: 18,
    minRate: 15,
    maxRate: 30,
    unit: 'HOUR',
    description: 'Taux horaire pour les services de jardinage',
    commission: 0.15
  },
  {
    type: 'BABYSITTING',
    name: 'Garde d\'enfants',
    suggestedRate: 12,
    minRate: 10,
    maxRate: 20,
    unit: 'HOUR',
    description: 'Taux horaire pour la garde d\'enfants',
    commission: 0.10
  },
  {
    type: 'PET_SITTING',
    name: 'Garde d\'animaux',
    suggestedRate: 10,
    minRate: 8,
    maxRate: 18,
    unit: 'HOUR',
    description: 'Taux horaire pour la garde d\'animaux',
    commission: 0.10
  },
  {
    type: 'TRANSPORT',
    name: 'Transport de personnes',
    suggestedRate: 1.2,
    minRate: 0.8,
    maxRate: 2.0,
    unit: 'KM',
    description: 'Tarif au kilomètre pour le transport',
    commission: 0.20
  },
  {
    type: 'TUTORING',
    name: 'Cours particuliers',
    suggestedRate: 25,
    minRate: 15,
    maxRate: 50,
    unit: 'HOUR',
    description: 'Taux horaire pour les cours particuliers',
    commission: 0.15
  },
  {
    type: 'HOME_REPAIR',
    name: 'Petits travaux',
    suggestedRate: 20,
    minRate: 15,
    maxRate: 40,
    unit: 'HOUR',
    description: 'Taux horaire pour les petits travaux',
    commission: 0.20
  }
];

export function ProviderRatesValidation() {
  const t = useTranslations("provider.validation.rates");
  const { user } = useAuth();
  const { execute } = useApi();
  const [rates, setRates] = useState<ProviderRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNegotiationDialog, setShowNegotiationDialog] = useState(false);
  const [selectedRate, setSelectedRate] = useState<ProviderRate | null>(null);
  const [negotiationMessage, setNegotiationMessage] = useState("");

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

  const fetchRates = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const response = await get(`/api/provider/rates?providerId=${user.id}`);
      if (response) {
        setRates(response.rates || []);
      }
    } catch (error) {
      console.error("Error fetching rates:", error);
      toast.error("Erreur lors du chargement des tarifs");
    } finally {
      setLoading(false);
    }
  };

  const proposeRate = async (serviceType: string, proposedRate: number, minimumCharge?: number, notes?: string) => {
    if (!user?.id) return;
    
    try {
      const response = await post("/api/provider/rates", {
        body: JSON.stringify({
          providerId: user.id,
          serviceType,
          proposedRate,
          minimumCharge,
          providerNotes: notes
        })
      });

      if (response) {
        toast.success("Tarif proposé avec succès");
        fetchRates();
      }
    } catch (error) {
      console.error("Error proposing rate:", error);
      toast.error("Erreur lors de la proposition de tarif");
    }
  };

  const requestNegotiation = async (rateId: string, message: string) => {
    if (!user?.id) return;
    
    try {
      const response = await post(`/api/provider/rates/${rateId}/negotiate`, {
        body: JSON.stringify({
          providerId: user.id,
          message
        })
      });

      if (response) {
        toast.success("Demande de négociation envoyée");
        setShowNegotiationDialog(false);
        setNegotiationMessage("");
        fetchRates();
      }
    } catch (error) {
      console.error("Error requesting negotiation:", error);
      toast.error("Erreur lors de la demande de négociation");
    }
  };

  const acceptRate = async (rateId: string) => {
    if (!user?.id) return;
    
    try {
      const response = await post(`/api/provider/rates/${rateId}/accept`, {
        body: JSON.stringify({ providerId: user.id })
      });

      if (response) {
        toast.success("Tarif accepté");
        fetchRates();
      }
    } catch (error) {
      console.error("Error accepting rate:", error);
      toast.error("Erreur lors de l'acceptation");
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      PENDING: { color: "bg-yellow-100 text-yellow-800", icon: Clock, label: "En attente" },
      APPROVED: { color: "bg-green-100 text-green-800", icon: CheckCircle, label: "Approuvé" },
      REJECTED: { color: "bg-red-100 text-red-800", icon: AlertCircle, label: "Rejeté" },
      NEGOTIATION: { color: "bg-blue-100 text-blue-800", icon: MessageSquare, label: "En négociation" }
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

  const getRateComparison = (serviceType: string, proposedRate: number) => {
    const serviceRate = SERVICE_RATES.find(sr => sr.type === serviceType);
    if (!serviceRate) return null;

    const difference = proposedRate - serviceRate.suggestedRate;
    const percentDiff = (difference / serviceRate.suggestedRate) * 100;

    return {
      suggested: serviceRate.suggestedRate,
      difference,
      percentDiff,
      isHigher: difference > 0,
      isInRange: proposedRate >= serviceRate.minRate && proposedRate <= serviceRate.maxRate
    };
  };

  const openNegotiation = (rate: ProviderRate) => {
    setSelectedRate(rate);
    setShowNegotiationDialog(true);
  };

  useEffect(() => {
    if (user?.id) {
      fetchRates();
    }
  }, [user?.id]);

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
      <div>
        <h3 className="text-lg font-semibold">Tarifs négociés</h3>
        <p className="text-gray-600">
          Fixation et négociation de vos tarifs avec EcoDeli selon votre expertise
        </p>
      </div>

      {/* Available Service Types for Rate Proposal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5" />
            <span>Services disponibles</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SERVICE_RATES.map((serviceRate) => {
              const existingRate = rates.find(r => r.serviceType === serviceRate.type);
              
              return (
                <div key={serviceRate.type} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{serviceRate.name}</h4>
                    {existingRate && getStatusBadge(existingRate.status)}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{serviceRate.description}</p>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tarif suggéré:</span>
                      <span className="font-medium">
                        {serviceRate.suggestedRate}€{serviceRate.unit === 'HOUR' ? '/h' : '/km'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fourchette:</span>
                      <span>{serviceRate.minRate}€ - {serviceRate.maxRate}€</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Commission EcoDeli:</span>
                      <span className="text-red-600">{(serviceRate.commission * 100).toFixed(0)}%</span>
                    </div>
                  </div>

                  {existingRate ? (
                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Votre tarif:</span>
                        <span className="font-medium text-green-600">
                          {existingRate.negotiatedRate || existingRate.proposedRate}€
                        </span>
                      </div>
                      {existingRate.status === 'APPROVED' && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Net (après commission):</span>
                          <span className="font-medium">
                            {existingRate.netRate.toFixed(2)}€
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Button 
                      size="sm" 
                      className="mt-3 w-full"
                      onClick={() => proposeRate(serviceRate.type, serviceRate.suggestedRate)}
                    >
                      Proposer ce service
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* My Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Handshake className="w-5 h-5" />
            <span>Mes tarifs</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rates.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Aucun tarif configuré
              </h3>
              <p className="text-gray-600">
                Commencez par proposer vos tarifs pour les services que vous souhaitez fournir
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {rates.map((rate) => {
                const serviceRate = SERVICE_RATES.find(sr => sr.type === rate.serviceType);
                const comparison = getRateComparison(rate.serviceType, rate.proposedRate);
                
                return (
                  <div key={rate.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium">{serviceRate?.name}</h4>
                          {getStatusBadge(rate.status)}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Tarif proposé:</span>
                            <p className="font-medium">{rate.proposedRate}€</p>
                          </div>
                          {rate.negotiatedRate && (
                            <div>
                              <span className="text-gray-600">Tarif négocié:</span>
                              <p className="font-medium text-blue-600">{rate.negotiatedRate}€</p>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-600">Commission:</span>
                            <p className="font-medium text-red-600">{(rate.commission * 100).toFixed(0)}%</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Net:</span>
                            <p className="font-medium text-green-600">{rate.netRate.toFixed(2)}€</p>
                          </div>
                        </div>

                        {comparison && (
                          <div className="mt-3 flex items-center space-x-4 text-sm">
                            <div className="flex items-center space-x-1">
                              {comparison.isHigher ? (
                                <TrendingUp className="w-4 h-4 text-green-600" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-red-600" />
                              )}
                              <span className={comparison.isHigher ? "text-green-600" : "text-red-600"}>
                                {comparison.isHigher ? "+" : ""}{comparison.difference.toFixed(2)}€ 
                                ({comparison.percentDiff.toFixed(1)}%)
                              </span>
                            </div>
                            <Badge variant={comparison.isInRange ? "default" : "destructive"}>
                              {comparison.isInRange ? "Dans la fourchette" : "Hors fourchette"}
                            </Badge>
                          </div>
                        )}

                        {rate.status === 'REJECTED' && rate.adminNotes && (
                          <div className="mt-3 bg-red-50 border border-red-200 rounded p-3">
                            <p className="text-sm text-red-800">
                              <strong>Motif de rejet:</strong> {rate.adminNotes}
                            </p>
                          </div>
                        )}

                        {rate.status === 'NEGOTIATION' && rate.adminNotes && (
                          <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-3">
                            <p className="text-sm text-blue-800">
                              <strong>Proposition EcoDeli:</strong> {rate.adminNotes}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex space-x-2">
                        {rate.status === 'PENDING' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openNegotiation(rate)}
                          >
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Négocier
                          </Button>
                        )}

                        {rate.status === 'NEGOTIATION' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => acceptRate(rate.id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Accepter
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openNegotiation(rate)}
                            >
                              <MessageSquare className="w-4 h-4 mr-1" />
                              Contre-proposer
                            </Button>
                          </>
                        )}

                        {rate.status === 'REJECTED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openNegotiation(rate)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Modifier
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Negotiation Dialog */}
      <Dialog open={showNegotiationDialog} onOpenChange={setShowNegotiationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Négociation de tarif</DialogTitle>
            <DialogDescription>
              {selectedRate && `Service: ${SERVICE_RATES.find(sr => sr.type === selectedRate.serviceType)?.name}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="negotiationMessage">Message de négociation</Label>
              <Textarea
                id="negotiationMessage"
                value={negotiationMessage}
                onChange={(e) => setNegotiationMessage(e.target.value)}
                placeholder="Expliquez vos arguments pour justifier votre tarif..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNegotiationDialog(false)}>
              Annuler
            </Button>
            <Button 
              onClick={() => selectedRate && requestNegotiation(selectedRate.id, negotiationMessage)}
              disabled={!negotiationMessage.trim()}
            >
              Envoyer la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}