"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  CheckCircle,
  Pause,
  Download,
  FileText,
  Calendar,
  DollarSign,
  Percent,
  Clock} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Contract {
  id: string;
  contractNumber: string;
  title: string;
  status: string;
  type: string;
  monthlyFee?: number;
  commissionRate?: number;
  merchantCategory?: string;
  effectiveDate?: Date;
  expiresAt?: Date;
  createdAt: Date;
  merchant: {
    id: string;
    companyName: string;
    businessType: string;
    email: string;
  };
  template?: {
    id: string;
    name: string;
    version: string;
  };
  signedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  count: {
    amendments: number;
    negotiations: number;
    performances: number;
  };
}

interface ContractsListProps {
  contracts: Contract[];
  totalPages: number;
  currentPage: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onEdit: (contract: Contract) => void;
  onDelete: (contractId: string) => void;
  onActivate: (contractId: string) => void;
  onSuspend: (contractId: string) => void;
  onGeneratePdf: (contractId: string) => void;
}

const CONTRACT_STATUS_COLORS = {
  DRAFT: "bg-gray-100 text-gray-800", PENDING_SIGNATURE: "bg-blue-100 text-blue-800",
  ACTIVE: "bg-green-100 text-green-800",
  SUSPENDED: "bg-yellow-100 text-yellow-800",
  TERMINATED: "bg-red-100 text-red-800",
  EXPIRED: "bg-orange-100 text-orange-800",
  CANCELLED: "bg-gray-100 text-gray-600"};

const CONTRACT_STATUS_LABELS = {
  DRAFT: "Brouillon", PENDING_SIGNATURE: "En attente",
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
  TERMINATED: "Résilié",
  EXPIRED: "Expiré",
  CANCELLED: "Annulé"};

const CONTRACT_TYPE_LABELS = {
  STANDARD: "Standard",
  PREMIUM: "Premium",
  PARTNER: "Partenaire",
  TRIAL: "Essai",
  CUSTOM: "Personnalisé"};

export function ContractsList({
  contracts,
  totalPages,
  currentPage,
  isLoading,
  onPageChange,
  onEdit,
  onDelete,
  onActivate,
  onSuspend,
  onGeneratePdf}: ContractsListProps) {
  const [deleteContractId, setDeleteContractId] = useState<string | null>(null);
  const [suspendContractId, setSuspendContractId] = useState<string | null>(
    null,
  );

  const handleDeleteConfirm = () => {
    if (deleteContractId) {
      onDelete(deleteContractId);
      setDeleteContractId(null);
    }
  };

  const handleSuspendConfirm = () => {
    if (suspendContractId) {
      onSuspend(suspendContractId);
      setSuspendContractId(null);
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR"}).format(amount);
  };

  const formatPercentage = (rate?: number) => {
    if (!rate) return "-";
    return `${(rate * 100).toFixed(1)}%`;
  };

  const isExpiringSoon = (expiresAt?: Date) => {
    if (!expiresAt) return false;
    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );
    return expiresAt <= thirtyDaysFromNow;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Contrats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5  }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (contracts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <FileText className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucun contrat trouvé</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Aucun contrat ne correspond à vos critères de recherche. Essayez de
            modifier les filtres ou de créer un nouveau contrat.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Contrats ({ contracts.length })
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contrat</TableHead>
                  <TableHead>Commerçant</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Financier</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((contract) => (
                  <TableRow key={contract.id}>
                    {/* Contrat */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-sm">
                          {contract.contractNumber}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {contract.title}
                        </div>
                        {contract.template && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <FileText className="h-3 w-3" />
                            {contract.template.name} v
                            {contract.template.version}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Commerçant */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-sm">
                          {contract.merchant.companyName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {contract.merchant.businessType}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {contract.merchant.user.email}
                        </div>
                      </div>
                    </TableCell>

                    {/* Type */}
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="outline">
                          {CONTRACT_TYPE_LABELS[
                            contract.type as keyof typeof CONTRACT_TYPE_LABELS
                          ] || contract.type}
                        </Badge>
                        {contract.merchantCategory && (
                          <div className="text-xs text-muted-foreground">
                            {contract.merchantCategory}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Statut */}
                    <TableCell>
                      <div className="space-y-1">
                        <Badge
                          className={
                            CONTRACT_STATUS_COLORS[
                              contract.status as keyof typeof CONTRACT_STATUS_COLORS
                            ]
                          }
                        >
                          {CONTRACT_STATUS_LABELS[
                            contract.status as keyof typeof CONTRACT_STATUS_LABELS
                          ] || contract.status}
                        </Badge>
                        {contract.expiresAt &&
                          isExpiringSoon(contract.expiresAt) && (
                            <div className="flex items-center gap-1 text-xs text-orange-600">
                              <Clock className="h-3 w-3" />
                              Expire bientôt
                            </div>
                          )}
                      </div>
                    </TableCell>

                    {/* Financier */}
                    <TableCell>
                      <div className="space-y-1">
                        {contract.monthlyFee && (
                          <div className="flex items-center gap-1 text-sm">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(contract.monthlyFee)}/mois
                          </div>
                        )}
                        {contract.commissionRate && (
                          <div className="flex items-center gap-1 text-sm">
                            <Percent className="h-3 w-3" />
                            {formatPercentage(contract.commissionRate)}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Dates */}
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(contract.createdAt, "dd/MM/yyyy", { locale })}
                        </div>
                        {contract.effectiveDate && (
                          <div className="text-xs text-muted-foreground">
                            Effectif:{" "}
                            {format(contract.effectiveDate, "dd/MM/yyyy", { locale })}
                          </div>
                        )}
                        {contract.expiresAt && (
                          <div className="text-xs text-muted-foreground">
                            Expire:{" "}
                            {format(contract.expiresAt, "dd/MM/yyyy", { locale })}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(contract)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => onGeneratePdf(contract.id)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Télécharger PDF
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          {contract.status === "DRAFT" && (
                            <DropdownMenuItem
                              onClick={() => onActivate(contract.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Activer
                            </DropdownMenuItem>
                          )}

                          {contract.status === "ACTIVE" && (
                            <DropdownMenuItem
                              onClick={() => setSuspendContractId(contract.id)}
                            >
                              <Pause className="h-4 w-4 mr-2" />
                              Suspendre
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          {contract.status !== "ACTIVE" && (
                            <DropdownMenuItem
                              onClick={() => setDeleteContractId(contract.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} sur {totalPages}
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs de confirmation */}
      <AlertDialog
        open={!!deleteContractId}
        onOpenChange={() => setDeleteContractId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce contrat ? Cette action est
              irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!suspendContractId}
        onOpenChange={() => setSuspendContractId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suspension</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir suspendre ce contrat ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspendConfirm}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Suspendre
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
