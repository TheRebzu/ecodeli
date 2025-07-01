"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  AlertTriangle,
  Clock,
  MapPin,
  Phone,
  Package,
  XCircle,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

interface DeliveryProblemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deliveryId: string;
  onProblemReported: () => void;
}

const PROBLEM_TYPES = [
  {
    id: "address_issue",
    icon: MapPin,
    title: "Problème d'adresse",
    description: "Adresse incorrecte, inexistante ou inaccessible"
  },
  {
    id: "client_unavailable",
    icon: Phone,
    title: "Client injoignable",
    description: "Le client ne répond pas au téléphone ou à la porte"
  },
  {
    id: "package_issue",
    icon: Package,
    title: "Problème avec le colis",
    description: "Colis endommagé, manquant ou non conforme"
  },
  {
    id: "delay",
    icon: Clock,
    title: "Retard important",
    description: "Retard dû à des circonstances exceptionnelles"
  },
  {
    id: "cancel",
    icon: XCircle,
    title: "Annuler la livraison",
    description: "Impossible de continuer la livraison",
    isCancel: true
  }
];

export default function DeliveryProblemDialog({
  open,
  onOpenChange,
  deliveryId,
  onProblemReported
}: DeliveryProblemDialogProps) {
  const [selectedProblem, setSelectedProblem] = useState("");
  const [problemDescription, setProblemDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selectedProblem || !problemDescription.trim()) {
      toast.error("Veuillez sélectionner un type de problème et donner une description");
      return;
    }

    const isCancel = PROBLEM_TYPES.find(p => p.id === selectedProblem)?.isCancel;

    try {
      setLoading(true);
      
      const endpoint = isCancel 
        ? `/api/deliverer/deliveries/${deliveryId}/cancel`
        : `/api/deliverer/deliveries/${deliveryId}/report-problem`;
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          problemType: selectedProblem,
          description: problemDescription.trim(),
          reportedAt: new Date().toISOString()
        }),
      });

      if (response.ok) {
        toast.success(isCancel ? "Livraison annulée" : "Problème signalé, notre équipe va vous contacter");
        setSelectedProblem("");
        setProblemDescription("");
        onOpenChange(false);
        onProblemReported();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Erreur lors du signalement");
      }
    } catch (error) {
      console.error("Error reporting problem:", error);
      toast.error("Erreur lors du signalement");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSelectedProblem("");
      setProblemDescription("");
      onOpenChange(false);
    }
  };

  const selectedProblemData = PROBLEM_TYPES.find(p => p.id === selectedProblem);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center text-orange-600">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Signaler un problème
          </DialogTitle>
          <DialogDescription>
            Décrivez le problème rencontré avec cette livraison. Notre équipe vous aidera à le résoudre.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-3 block">
              Type de problème *
            </Label>
            <RadioGroup value={selectedProblem} onValueChange={setSelectedProblem}>
              <div className="space-y-3">
                {PROBLEM_TYPES.map((problem) => {
                  const Icon = problem.icon;
                  return (
                    <div key={problem.id} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-gray-50">
                      <RadioGroupItem value={problem.id} id={problem.id} className="mt-1" />
                      <div className="flex-1">
                        <Label 
                          htmlFor={problem.id} 
                          className={`flex items-center space-x-2 cursor-pointer ${problem.isCancel ? 'text-red-600' : ''}`}
                        >
                          <Icon className={`w-4 h-4 ${problem.isCancel ? 'text-red-500' : 'text-gray-500'}`} />
                          <span className="font-medium">{problem.title}</span>
                        </Label>
                        <p className={`text-sm mt-1 ${problem.isCancel ? 'text-red-600' : 'text-gray-600'}`}>
                          {problem.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </RadioGroup>
          </div>

          {selectedProblem && (
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Description détaillée *
              </Label>
              <Textarea
                placeholder={`Décrivez en détail le problème rencontré...`}
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Plus de détails vous aideront à résoudre le problème rapidement
              </p>
            </div>
          )}

          {selectedProblemData?.isCancel && (
            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">Attention</span>
              </div>
              <p className="text-sm text-red-700">
                L'annulation d'une livraison peut impacter votre note. Assurez-vous d'avoir une raison valable.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={loading}
          >
            Retour
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedProblem || !problemDescription.trim() || problemDescription.length < 10 || loading}
            className={selectedProblemData?.isCancel ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700"}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 mr-2" />
                {selectedProblemData?.isCancel ? "Annuler la livraison" : "Signaler le problème"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 