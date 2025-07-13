"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, FileText, MessageSquare, Clock } from "lucide-react";

interface Dispute {
  id: string;
  type: "DELIVERY" | "SERVICE" | "PAYMENT" | "STORAGE" | "OTHER";
  status: "PENDING" | "IN_REVIEW" | "RESOLVED" | "CLOSED";
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  referenceId?: string;
  amount?: number;
}

const disputeTypes = [
  { value: "DELIVERY", label: "Problème de livraison", icon: "🚚" },
  { value: "SERVICE", label: "Problème de service", icon: "🛠️" },
  { value: "PAYMENT", label: "Problème de paiement", icon: "💳" },
  { value: "STORAGE", label: "Problème de stockage", icon: "📦" },
  { value: "OTHER", label: "Autre problème", icon: "❓" },
];

const disputeStatuses = {
  PENDING: { label: "En attente", color: "bg-yellow-100 text-yellow-800" },
  IN_REVIEW: { label: "En cours d'examen", color: "bg-blue-100 text-blue-800" },
  RESOLVED: { label: "Résolu", color: "bg-green-100 text-green-800" },
  CLOSED: { label: "Fermé", color: "bg-gray-100 text-gray-800" },
};

export default function DisputeForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [disputeType, setDisputeType] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);

  // Récupération des litiges existants
  React.useEffect(() => {
    const fetchDisputes = async () => {
      try {
        const response = await fetch("/api/disputes");
        if (response.ok) {
          const data = await response.json();
          setDisputes(data.disputes || []);
        }
      } catch (error) {
        console.error("Error fetching disputes:", error);
      }
    };

    fetchDisputes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!disputeType || !title || !description) {
      setError("Veuillez remplir tous les champs obligatoires");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const disputeData = {
        type: disputeType,
        title,
        description,
        referenceId: referenceId || undefined,
        amount: amount ? parseFloat(amount) : undefined,
      };

      const response = await fetch("/api/disputes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(disputeData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Erreur lors de la création du litige",
        );
      }

      const newDispute = await response.json();
      setDisputes((prev) => [newDispute, ...prev]);

      // Reset form
      setDisputeType("");
      setTitle("");
      setDescription("");
      setReferenceId("");
      setAmount("");
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeIcon = (type: string) => {
    return disputeTypes.find((t) => t.value === type)?.icon || "❓";
  };

  const getStatusBadge = (status: string) => {
    const statusInfo = disputeStatuses[status as keyof typeof disputeStatuses];
    return <Badge className={statusInfo.color}>{statusInfo.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Formulaire de création */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Signaler un problème</span>
          </CardTitle>
          <CardDescription>
            Décrivez votre problème et nous vous aiderons à le résoudre
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="w-full">Créer un nouveau litige</Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nouveau litige</DialogTitle>
                <DialogDescription>
                  Remplissez les informations pour signaler votre problème
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Type de problème *
                  </label>
                  <Select value={disputeType} onValueChange={setDisputeType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner le type de problème" />
                    </SelectTrigger>
                    <SelectContent>
                      {disputeTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center space-x-2">
                            <span>{type.icon}</span>
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Titre du problème *
                  </label>
                  <Input
                    placeholder="Résumé du problème"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Description détaillée *
                  </label>
                  <Textarea
                    placeholder="Décrivez votre problème en détail..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Référence (optionnel)
                    </label>
                    <Input
                      placeholder="ID de livraison, réservation..."
                      value={referenceId}
                      onChange={(e) => setReferenceId(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Montant concerné (optionnel)
                    </label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                </div>

                {error && <div className="text-red-500 text-sm">{error}</div>}

                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? "Envoi..." : "Envoyer le litige"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Liste des litiges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Mes litiges</span>
          </CardTitle>
          <CardDescription>
            Historique de vos signalements et problèmes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {disputes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun litige pour le moment
            </div>
          ) : (
            <div className="space-y-4">
              {disputes.map((dispute) => (
                <Card
                  key={dispute.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl">
                          {getTypeIcon(dispute.type)}
                        </span>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{dispute.title}</h4>
                            {getStatusBadge(dispute.status)}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {dispute.description}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                Créé le{" "}
                                {new Date(
                                  dispute.createdAt,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                            {dispute.referenceId && (
                              <span>Ref: {dispute.referenceId}</span>
                            )}
                            {dispute.amount && <span>{dispute.amount}€</span>}
                          </div>
                        </div>
                      </div>

                      <Button variant="outline" size="sm">
                        Voir détails
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Support client</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Temps de réponse</h4>
              <p className="text-muted-foreground">
                Nous répondons généralement sous 24h en semaine
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Remboursements</h4>
              <p className="text-muted-foreground">
                Les remboursements sont traités sous 5-7 jours ouvrés
              </p>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Besoin d'aide urgente ?</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Contactez notre support client par téléphone ou email
            </p>
            <div className="flex space-x-4 text-sm">
              <div>📞 01 23 45 67 89</div>
              <div>📧 support@ecodeli.com</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
