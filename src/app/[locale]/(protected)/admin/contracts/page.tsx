"use client";

import { useState } from "react";
import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, FileText, Loader2 } from "lucide-react";
import { useAdminContracts } from "@/hooks/admin/use-admin-contracts";
import {
  ContractsStats,
  ContractsFilters,
  ContractsList,
  ContractFormModal,
} from "@/components/admin/contracts";

// export const metadata: Metadata = {
//   title: 'Gestion des Contrats - Administration EcoDeli',
//   description: 'Interface d\'administration pour la gestion des contrats commerçants',
// };

export default function AdminContractsPage() {
  const {
    // Data
    contracts,
    totalPages,
    currentPage,
    stats,
    merchants,
    filters,
    editingContract,

    // Loading states
    isLoadingContracts,
    isLoadingStats,
    isLoadingMerchants,
    isCreating,
    isUpdating,
    isDeleting,
    isActivating,
    isSuspending,
    isGeneratingPdf,

    // Modal states
    isCreateModalOpen,
    setIsCreateModalOpen,

    // Actions
    handleFiltersChange,
    handleClearFilters,
    handlePageChange,
    handleCreateContract,
    handleUpdateContract,
    handleDeleteContract,
    handleActivateContract,
    handleSuspendContract,
    handleGeneratePdf,
    handleEditContract,
    setEditingContract,

    // Refetch functions
    refetchContracts,
    refetchStats,
  } = useAdminContracts();

  const [showCreateForm, setShowCreateForm] = useState(false);

  return (
    <div className="space-y-6">
      {/* En-tête de la page */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Gestion des Contrats
          </h1>
          <p className="text-muted-foreground">
            Gérez les contrats commerçants, négociations et conditions
            commerciales
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => refetchContracts()}
            variant="outline"
            disabled={isLoadingContracts}
          >
            {isLoadingContracts ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            Actualiser
          </Button>
          <Button onClick={() => setShowCreateForm(true)} disabled={isCreating}>
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Nouveau Contrat
          </Button>
        </div>
      </div>

      <Separator />

      {/* Statistiques */}
      <ContractsStats stats={stats} isLoading={isLoadingStats} />

      <Separator />

      {/* Filtres */}
      <ContractsFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
      />

      {/* Liste des contrats */}
      <ContractsList
        contracts={contracts}
        totalPages={totalPages}
        currentPage={currentPage}
        isLoading={isLoadingContracts}
        onPageChange={handlePageChange}
        onEdit={handleEditContract}
        onDelete={handleDeleteContract}
        onActivate={handleActivateContract}
        onSuspend={handleSuspendContract}
        onGeneratePdf={handleGeneratePdf}
      />

      {/* États de chargement globaux */}
      {(isDeleting || isActivating || isSuspending || isGeneratingPdf) && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <Card className="w-80">
            <CardContent className="flex items-center justify-center p-6">
              <Loader2 className="h-6 w-6 animate-spin mr-3" />
              <span className="text-sm">
                {isDeleting && "Suppression en cours..."}
                {isActivating && "Activation en cours..."}
                {isSuspending && "Suspension en cours..."}
                {isGeneratingPdf && "Génération du PDF..."}
              </span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de création/édition de contrat */}
      <ContractFormModal
        isOpen={showCreateForm || !!editingContract}
        onClose={() => {
          setShowCreateForm(false);
          setEditingContract(null);
        }}
        onSubmit={editingContract ? handleUpdateContract : handleCreateContract}
        contract={editingContract}
        merchants={merchants}
        isLoading={isCreating || isUpdating}
      />

      {/* Informations de debug en mode développement */}
      {process.env.NODE_ENV === "development" && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Debug - Mode Développement
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <div>Contrats chargés: {contracts.length}</div>
            <div>
              Page actuelle: {currentPage}/{totalPages}
            </div>
            <div>Filtres actifs: {Object.keys(filters).length}</div>
            <div>
              Statistiques:{" "}
              {stats
                ? `Chargées (total: ${stats.totalContracts})`
                : "En cours..."}
            </div>
            <div>Commerçants: {merchants.length} disponibles</div>
            <div>États de chargement:</div>
            <div className="ml-2">
              - Contrats: {isLoadingContracts ? "Chargement..." : "OK"}
            </div>
            <div className="ml-2">
              - Stats: {isLoadingStats ? "Chargement..." : "OK"}
            </div>
            <div className="ml-2">
              - Commerçants: {isLoadingMerchants ? "Chargement..." : "OK"}
            </div>
            {editingContract && (
              <div>Édition: {editingContract.contractNumber}</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
