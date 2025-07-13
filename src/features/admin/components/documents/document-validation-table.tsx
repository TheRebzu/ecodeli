"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  Check,
  X,
  AlertTriangle,
  User,
  Calendar,
  Download,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface DocumentValidationTableProps {
  documents: any[];
  onValidate: (
    id: string,
    status: "APPROVED" | "REJECTED",
    notes?: string,
  ) => void;
  onView: (document: any) => void;
  getStatusBadge: (status: string) => React.ReactNode;
  getDocumentTypeLabel: (type: string) => string;
  getUrgencyLevel: (document: any) => "low" | "medium" | "high";
}

export function DocumentValidationTable({
  documents,
  onValidate,
  onView,
  getStatusBadge,
  getDocumentTypeLabel,
  getUrgencyLevel,
}: DocumentValidationTableProps) {
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [bulkValidating, setBulkValidating] = useState(false);

  const handleSelectDoc = (docId: string) => {
    setSelectedDocs((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId],
    );
  };

  const handleSelectAll = () => {
    const pendingDocs = documents.filter(
      (doc) => doc.validationStatus === "PENDING",
    );
    setSelectedDocs(
      selectedDocs.length === pendingDocs.length
        ? []
        : pendingDocs.map((doc) => doc.id),
    );
  };

  const handleBulkValidation = async (status: "APPROVED" | "REJECTED") => {
    setBulkValidating(true);
    try {
      const response = await fetch("/api/admin/documents/validate?bulk=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentIds: selectedDocs,
          status,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSelectedDocs([]);
        // Rafraîchir la liste
        window.location.reload();
      }
    } catch (error) {
      console.error("Erreur validation en lot:", error);
    } finally {
      setBulkValidating(false);
    }
  };

  const getUrgencyIndicator = (urgency: string) => {
    switch (urgency) {
      case "high":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "medium":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getUserDisplayName = (user: any) => {
    if (user.profile?.firstName && user.profile?.lastName) {
      return `${user.profile.firstName} ${user.profile.lastName}`;
    }
    return user.email;
  };

  const getUserInitials = (user: any) => {
    if (user.profile?.firstName && user.profile?.lastName) {
      return `${user.profile.firstName[0]}${user.profile.lastName[0]}`;
    }
    return user.email.substring(0, 2).toUpperCase();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "DELIVERER":
        return "bg-blue-100 text-blue-800";
      case "PROVIDER":
        return "bg-green-100 text-green-800";
      case "MERCHANT":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Aucun document trouvé</h3>
        <p className="text-muted-foreground">
          Aucun document ne correspond aux critères de recherche.
        </p>
      </div>
    );
  }

  const pendingDocs = documents.filter(
    (doc) => doc.validationStatus === "PENDING",
  );

  return (
    <div className="space-y-4">
      {/* Actions en lot */}
      {selectedDocs.length > 0 && (
        <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg border">
          <span className="text-sm font-medium">
            {selectedDocs.length} document(s) sélectionné(s)
          </span>
          <div className="flex gap-2 ml-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkValidation("APPROVED")}
              disabled={bulkValidating}
              className="text-green-600 hover:text-green-700"
            >
              <Check className="w-4 h-4 mr-1" />
              Approuver tout
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkValidation("REJECTED")}
              disabled={bulkValidating}
              className="text-red-600 hover:text-red-700"
            >
              <X className="w-4 h-4 mr-1" />
              Rejeter tout
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedDocs([])}
            >
              Annuler
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    selectedDocs.length === pendingDocs.length &&
                    pendingDocs.length > 0
                  }
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Document</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Soumis</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((document) => {
              const urgency = getUrgencyLevel(document);
              const isPending = document.validationStatus === "PENDING";

              return (
                <TableRow
                  key={document.id}
                  className={urgency === "high" ? "bg-red-50" : ""}
                >
                  <TableCell>
                    {isPending && (
                      <Checkbox
                        checked={selectedDocs.includes(document.id)}
                        onCheckedChange={() => handleSelectDoc(document.id)}
                      />
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          {getUserInitials(document.user)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">
                          {getUserDisplayName(document.user)}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge
                            className={`text-xs ${getRoleBadgeColor(document.user.role)}`}
                          >
                            {document.user.role}
                          </Badge>
                          {getUrgencyIndicator(urgency)}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="font-medium text-sm">{document.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {document.size &&
                        `${Math.round(document.size / 1024)} KB`}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {getDocumentTypeLabel(document.type)}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    {getStatusBadge(document.validationStatus)}
                  </TableCell>

                  <TableCell>
                    <div className="text-sm">
                      {formatDistanceToNow(new Date(document.createdAt), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onView(document)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>

                      {isPending && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onValidate(document.id, "APPROVED")}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onValidate(document.id, "REJECTED")}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onView(document)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Voir les détails
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => window.open(document.url, "_blank")}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Télécharger
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              window.open(
                                `/admin/users/${document.user.id}`,
                                "_blank",
                              )
                            }
                          >
                            <User className="w-4 h-4 mr-2" />
                            Voir le profil
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
