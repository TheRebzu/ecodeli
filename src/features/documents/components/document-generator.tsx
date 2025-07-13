"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Download,
  FileText,
  Receipt,
  Award,
  FileContract,
  Loader2,
  ExternalLink,
  History,
} from "lucide-react";

interface DocumentGeneratorProps {
  entityId?: string;
  entityType?: string;
  onGenerated?: (fileUrl: string) => void;
}

type DocumentType = "delivery-slip" | "contract" | "invoice" | "certificate";

const documentTypes = [
  {
    value: "delivery-slip" as DocumentType,
    label: "Bordereau de livraison",
    icon: FileText,
    description: "Document officiel pour les livraisons",
    color: "bg-blue-500",
  },
  {
    value: "contract" as DocumentType,
    label: "Contrat de service",
    icon: FileContract,
    description: "Contrat entre prestataire et client",
    color: "bg-green-500",
  },
  {
    value: "invoice" as DocumentType,
    label: "Facture",
    icon: Receipt,
    description: "Facture pour les services rendus",
    color: "bg-yellow-500",
  },
  {
    value: "certificate" as DocumentType,
    label: "Certificat de livraison",
    icon: Award,
    description: "Certification de livraison réussie",
    color: "bg-purple-500",
  },
];

export function DocumentGenerator({
  entityId: initialEntityId,
  entityType,
  onGenerated,
}: DocumentGeneratorProps) {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<DocumentType | "">("");
  const [entityId, setEntityId] = useState(initialEntityId || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDocs, setGeneratedDocs] = useState<
    Array<{
      type: DocumentType;
      fileName: string;
      fileUrl: string;
      generatedAt: string;
    }>
  >([]);

  const handleGenerate = async () => {
    if (!selectedType || !entityId) {
      toast({
        title: "Erreur",
        description:
          "Veuillez sélectionner un type de document et saisir un ID d'entité",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/documents/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: selectedType,
          entityId,
          options: {
            includeQR: true,
            language: "fr",
            format: "pdf",
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erreur lors de la génération");
      }

      const newDoc = {
        type: selectedType,
        fileName: result.data.fileName,
        fileUrl: result.data.fileUrl,
        generatedAt: result.data.generatedAt,
      };

      setGeneratedDocs((prev) => [newDoc, ...prev]);

      toast({
        title: "Document généré !",
        description: `Le ${documentTypes.find((d) => d.value === selectedType)?.label} a été généré avec succès.`,
      });

      onGenerated?.(result.data.downloadUrl);
    } catch (error) {
      console.error("Generation error:", error);
      toast({
        title: "Erreur de génération",
        description:
          error instanceof Error
            ? error.message
            : "Une erreur inattendue s'est produite",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedDocType = documentTypes.find((d) => d.value === selectedType);

  return (
    <div className="space-y-6">
      {/* Générateur principal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Générateur de Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sélection du type de document */}
          <div>
            <Label htmlFor="document-type">Type de document</Label>
            <Select
              value={selectedType}
              onValueChange={(value) => setSelectedType(value as DocumentType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir le type de document" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {type.description}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* ID de l'entité */}
          <div>
            <Label htmlFor="entity-id">
              ID de l'entité {entityType && `(${entityType})`}
            </Label>
            <Input
              id="entity-id"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              placeholder="Saisissez l'ID de l'annonce, contrat, paiement..."
              disabled={!!initialEntityId}
            />
            {selectedType && (
              <p className="text-sm text-muted-foreground mt-1">
                {selectedType === "delivery-slip" &&
                  "ID de l'annonce à documenter"}
                {selectedType === "contract" && "ID du contrat à générer"}
                {selectedType === "invoice" && "ID du paiement à facturer"}
                {selectedType === "certificate" &&
                  "ID de la livraison terminée"}
              </p>
            )}
          </div>

          {/* Aperçu du document sélectionné */}
          {selectedDocType && (
            <div
              className={`p-4 rounded-lg border-2 border-dashed ${selectedDocType.color.replace("bg-", "border-")} bg-opacity-10`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${selectedDocType.color} text-white`}
                >
                  <selectedDocType.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">{selectedDocType.label}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedDocType.description}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Bouton de génération */}
          <Button
            onClick={handleGenerate}
            disabled={!selectedType || !entityId || isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Générer le document
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Historique des documents générés */}
      {generatedDocs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Documents générés récemment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {generatedDocs.map((doc, index) => {
                const docType = documentTypes.find((d) => d.value === doc.type);
                const Icon = docType?.icon || FileText;

                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${docType?.color || "bg-gray-500"} text-white`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium">{docType?.label}</div>
                        <div className="text-sm text-muted-foreground">
                          {doc.fileName} •{" "}
                          {new Date(doc.generatedAt).toLocaleString("fr-FR")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Prêt</Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(doc.fileUrl, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions d'utilisation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">💡 Instructions</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Bordereau de livraison:</strong> Utilisez l'ID de l'annonce
            pour générer le document officiel
          </p>
          <p>
            <strong>Contrat de service:</strong> Utilisez l'ID du contrat entre
            un prestataire et un client
          </p>
          <p>
            <strong>Facture:</strong> Utilisez l'ID du paiement pour générer la
            facture correspondante
          </p>
          <p>
            <strong>Certificat:</strong> Utilisez l'ID d'une livraison terminée
            pour certifier la réussite
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
