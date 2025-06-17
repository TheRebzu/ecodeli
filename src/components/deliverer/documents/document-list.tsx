"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  FileText, 
  Upload, 
  Download, 
  Eye, 
  Filter, 
  Search,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Types pour les documents des livreurs
enum DocumentStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED", 
  REJECTED = "REJECTED",
  EXPIRED = "EXPIRED"
}

enum DocumentType {
  IDENTITY = "IDENTITY",
  DRIVING_LICENSE = "DRIVING_LICENSE",
  VEHICLE_REGISTRATION = "VEHICLE_REGISTRATION",
  INSURANCE = "INSURANCE",
  CRIMINAL_RECORD = "CRIMINAL_RECORD"
}

interface DelivererDocument {
  id: string;
  type: DocumentType;
  filename: string;
  status: DocumentStatus;
  uploadedAt: Date;
  expiryDate?: Date;
  rejectionReason?: string;
  verifiedAt?: Date;
  verifiedBy?: string;
}

interface DocumentListProps {
  className?: string;
  onDocumentSelect?: (document: DelivererDocument) => void;
  onDocumentUpload?: () => void;
  showActions?: boolean;
}

export default function DocumentList({ 
  className,
  onDocumentSelect,
  onDocumentUpload,
  showActions = true
}: DocumentListProps) {
  const t = useTranslations("deliverer.documents");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<DocumentType | "all">("all");
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);

  // Récupération des documents via tRPC
  const { 
    data: documents, 
    isLoading, 
    error,
    refetch 
  } = api.deliverer.documents.getMyDocuments.useQuery({
    search: searchQuery || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
  });

  // Mutation pour télécharger un document
  const downloadMutation = api.deliverer.documents.downloadDocument.useMutation({
    onSuccess: (data) => {
      // Créer et télécharger le fichier
      const blob = new Blob([data.content], { type: data.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Téléchargement réussi",
        description: "Le document a été téléchargé avec succès",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur de téléchargement", 
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation pour renouveler un document
  const renewMutation = api.deliverer.documents.renewDocument.useMutation({
    onSuccess: () => {
      refetch();
      toast({
        title: "Renouvellement réussi",
        description: "Le document a été marqué pour renouvellement",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur de renouvellement",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusIcon = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.APPROVED:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case DocumentStatus.REJECTED:
        return <XCircle className="w-4 h-4 text-red-500" />;
      case DocumentStatus.PENDING:
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case DocumentStatus.EXPIRED:
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: DocumentStatus) => {
    const variants = {
      [DocumentStatus.APPROVED]: "default",
      [DocumentStatus.REJECTED]: "destructive",
      [DocumentStatus.PENDING]: "secondary",
      [DocumentStatus.EXPIRED]: "outline",
    } as const;

    const labels = {
      [DocumentStatus.APPROVED]: "Approuvé",
      [DocumentStatus.REJECTED]: "Rejeté", 
      [DocumentStatus.PENDING]: "En attente",
      [DocumentStatus.EXPIRED]: "Expiré",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {labels[status]}
      </Badge>
    );
  };

  const getTypeLabel = (type: DocumentType) => {
    const labels = {
      [DocumentType.IDENTITY]: "Pièce d'identité",
      [DocumentType.DRIVING_LICENSE]: "Permis de conduire",
      [DocumentType.VEHICLE_REGISTRATION]: "Carte grise",
      [DocumentType.INSURANCE]: "Assurance",
      [DocumentType.CRIMINAL_RECORD]: "Casier judiciaire",
    };
    return labels[type];
  };

  const handleDocumentDownload = (documentId: string) => {
    downloadMutation.mutate({ documentId });
  };

  const handleDocumentRenew = (documentId: string) => {
    renewMutation.mutate({ documentId });
  };

  const handleBulkAction = (action: string) => {
    if (selectedDocuments.length === 0) {
      toast({
        title: "Aucun document sélectionné",
        description: "Veuillez sélectionner au moins un document",
        variant: "destructive",
      });
      return;
    }

    switch (action) {
      case "download":
        selectedDocuments.forEach(handleDocumentDownload);
        break;
      case "renew":
        selectedDocuments.forEach(handleDocumentRenew);
        break;
      default:
        break;
    }
    
    setSelectedDocuments([]);
  };

  const filteredDocuments = documents?.filter(doc => {
    const matchesSearch = !searchQuery || 
      getTypeLabel(doc.type).toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.filename.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    const matchesType = typeFilter === "all" || doc.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  }) || [];

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Erreur lors du chargement des documents: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mes Documents</h1>
          <p className="text-muted-foreground">
            Gérez vos documents et justificatifs nécessaires pour les livraisons
          </p>
        </div>
        {showActions && onDocumentUpload && (
          <Button onClick={onDocumentUpload}>
            <Upload className="w-4 h-4 mr-2" />
            Ajouter un document
          </Button>
        )}
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtres et recherche
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Rechercher</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nom du fichier ou type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as DocumentStatus | "all")}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value={DocumentStatus.APPROVED}>Approuvé</SelectItem>
                  <SelectItem value={DocumentStatus.PENDING}>En attente</SelectItem>
                  <SelectItem value={DocumentStatus.REJECTED}>Rejeté</SelectItem>
                  <SelectItem value={DocumentStatus.EXPIRED}>Expiré</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as DocumentType | "all")}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {Object.values(DocumentType).map(type => (
                    <SelectItem key={type} value={type}>
                      {getTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Actions</Label>
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isLoading}
                className="w-full"
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
                Actualiser
              </Button>
            </div>
          </div>

          {/* Actions en lot */}
          {selectedDocuments.length > 0 && (
            <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">
                {selectedDocuments.length} document(s) sélectionné(s)
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction("download")}
                disabled={downloadMutation.isLoading}
              >
                <Download className="w-4 h-4 mr-1" />
                Télécharger
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction("renew")}
                disabled={renewMutation.isLoading}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Renouveler
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Liste des documents */}
      <Card>
        <CardHeader>
          <CardTitle>Documents ({filteredDocuments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Chargement des documents...</span>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun document</h3>
              <p className="text-muted-foreground mb-4">
                Vous n'avez pas encore de documents correspondant aux critères de recherche.
              </p>
              {onDocumentUpload && (
                <Button onClick={onDocumentUpload}>
                  <Upload className="w-4 h-4 mr-2" />
                  Télécharger votre premier document
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedDocuments.length === filteredDocuments.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDocuments(filteredDocuments.map(doc => doc.id));
                          } else {
                            setSelectedDocuments([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Nom du fichier</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date d'ajout</TableHead>
                    <TableHead>Expiration</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((document) => (
                    <TableRow 
                      key={document.id}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50",
                        onDocumentSelect && "cursor-pointer"
                      )}
                      onClick={() => onDocumentSelect?.(document)}
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedDocuments.includes(document.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            if (e.target.checked) {
                              setSelectedDocuments([...selectedDocuments, document.id]);
                            } else {
                              setSelectedDocuments(selectedDocuments.filter(id => id !== document.id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(document.status)}
                          {getTypeLabel(document.type)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{document.filename}</TableCell>
                      <TableCell>{getStatusBadge(document.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {new Date(document.uploadedAt).toLocaleDateString('fr-FR')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {document.expiryDate ? (
                          <div className={cn(
                            "flex items-center gap-1 text-sm",
                            new Date(document.expiryDate) < new Date() 
                              ? "text-red-500" 
                              : "text-muted-foreground"
                          )}>
                            <Calendar className="w-3 h-3" />
                            {new Date(document.expiryDate).toLocaleDateString('fr-FR')}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Pas d'expiration</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Logique pour voir le document
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDocumentDownload(document.id);
                            }}
                            disabled={downloadMutation.isLoading}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          {document.status === DocumentStatus.EXPIRED && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDocumentRenew(document.id);
                              }}
                              disabled={renewMutation.isLoading}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistiques */}
      {filteredDocuments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{filteredDocuments.length}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {filteredDocuments.filter(doc => doc.status === DocumentStatus.APPROVED).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Approuvés</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {filteredDocuments.filter(doc => doc.status === DocumentStatus.PENDING).length}
                  </div>
                  <div className="text-xs text-muted-foreground">En attente</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {filteredDocuments.filter(doc => 
                      doc.status === DocumentStatus.EXPIRED || 
                      doc.status === DocumentStatus.REJECTED
                    ).length}
                  </div>
                  <div className="text-xs text-muted-foreground">À renouveler</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 