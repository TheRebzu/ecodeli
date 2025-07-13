"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  FileTextIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ClockIcon,
  PenToolIcon,
  DownloadIcon,
  RefreshCwIcon,
  InfoIcon,
  CalendarIcon,
  EuroIcon,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ContractSummary {
  id: string;
  type: string;
  status: string;
  version: string;
  title: string;
  description?: string;
  commissionRate: number;
  minCommissionAmount?: number;
  setupFee: number;
  monthlyFee: number;
  validFrom: Date;
  validUntil?: Date;
  autoRenewal: boolean;
  renewalPeriod: number;
  maxOrdersPerMonth?: number;
  maxOrderValue?: number;
  merchantSignedAt?: Date;
  adminSignedAt?: Date;
  isFullySigned: boolean;
  daysUntilExpiry?: number;
  createdAt: Date;
}

interface ContractAmendment {
  id: string;
  version: string;
  title: string;
  description: string;
  effectiveDate: Date;
  merchantSignedAt?: Date;
  adminSignedAt?: Date;
  createdAt: Date;
}

interface BillingCycle {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  status: string;
  totalOrders: number;
  totalRevenue: number;
  commissionAmount: number;
  monthlyFee: number;
  totalAmount: number;
  dueDate?: Date;
  paidAt?: Date;
}

export default function MerchantContractsPage() {
  const { user } = useAuth();
  const [contract, setContract] = useState<ContractSummary | null>(null);
  const [amendments, setAmendments] = useState<ContractAmendment[]>([]);
  const [billingCycles, setBillingCycles] = useState<BillingCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [renewalDialogOpen, setRenewalDialogOpen] = useState(false);
  const [signature, setSignature] = useState("");
  const [renewalNotes, setRenewalNotes] = useState("");

  useEffect(() => {
    fetchContractData();
  }, []);

  const fetchContractData = async () => {
    try {
      setLoading(true);

      const [contractRes, amendmentsRes, billingRes] = await Promise.all([
        fetch("/api/merchant/contracts/current"),
        fetch("/api/merchant/contracts/amendments"),
        fetch("/api/merchant/contracts/billing"),
      ]);

      if (contractRes.ok) {
        const contractData = await contractRes.json();
        console.log("📄 Données contrat reçues:", contractData);
        if (contractData.success && contractData.contract) {
          console.log("✅ Contrat ID:", contractData.contract.id);
          setContract(contractData.contract);
        }
      }

      if (amendmentsRes.ok) {
        const amendmentsData = await amendmentsRes.json();
        if (amendmentsData.success && amendmentsData.amendments) {
          setAmendments(amendmentsData.amendments);
        }
      }

      if (billingRes.ok) {
        const billingData = await billingRes.json();
        if (billingData.success && billingData.billing) {
          // Convertir l'objet billing en format cycle de facturation
          const cycle = {
            id: `billing-${billingData.billing.period}`,
            periodStart: new Date(),
            periodEnd: new Date(),
            status: "PENDING",
            totalOrders: billingData.billing.totalOrders,
            totalRevenue: billingData.billing.totalRevenue,
            commissionAmount: billingData.billing.commission,
            monthlyFee: 0,
            totalAmount: billingData.billing.commission,
            dueDate: undefined,
            paidAt: undefined,
          };
          setBillingCycles([cycle]);
        }
      }
    } catch (error) {
      console.error("Erreur chargement contrat:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignContract = async () => {
    if (!contract || !signature.trim()) return;

    try {
      setSigning(true);

      console.log("🔐 Tentative de signature contrat ID:", contract.id);

      const response = await fetch(
        `/api/merchant/contracts/${contract.id}/sign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signature: signature.trim() }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la signature");
      }

      alert("Contrat signé avec succès!");
      setSignatureDialogOpen(false);
      setSignature("");
      fetchContractData();
    } catch (error) {
      console.error("❌ Erreur signature:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Erreur lors de la signature du contrat",
      );
    } finally {
      setSigning(false);
    }
  };

  const handleRequestRenewal = async () => {
    try {
      const response = await fetch("/api/merchant/contracts/renewal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: renewalNotes }),
      });

      if (!response.ok) throw new Error("Erreur lors de la demande");

      alert("Demande de renouvellement envoyée!");
      setRenewalDialogOpen(false);
      setRenewalNotes("");
      fetchContractData();
    } catch (error) {
      console.error("Erreur demande renouvellement:", error);
      alert("Erreur lors de la demande de renouvellement");
    }
  };

  const downloadContractPDF = async () => {
    if (!contract) return;

    try {
      const response = await fetch(
        `/api/merchant/contracts/${contract.id}/pdf`,
      );
      if (!response.ok) throw new Error("Erreur génération PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contrat-${contract.version}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Erreur téléchargement PDF:", error);
      alert("Erreur lors du téléchargement");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-green-100 text-green-800">Actif</Badge>;
      case "PENDING":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">En attente</Badge>
        );
      case "DRAFT":
        return <Badge className="bg-gray-100 text-gray-800">Brouillon</Badge>;
      case "SUSPENDED":
        return <Badge variant="destructive">Suspendu</Badge>;
      case "TERMINATED":
        return <Badge variant="destructive">Résilié</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getBillingStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge className="bg-green-100 text-green-800">Payé</Badge>;
      case "PENDING":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">En attente</Badge>
        );
      case "OVERDUE":
        return <Badge variant="destructive">En retard</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <FileTextIcon className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">Contrats</h1>
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FileTextIcon className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">Contrats</h1>
          <p className="text-muted-foreground">
            Gestion de votre contrat EcoDeli et facturation
          </p>
        </div>
      </div>

      {contract ? (
        <Tabs defaultValue="contract" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="contract">Contrat actuel</TabsTrigger>
            <TabsTrigger value="billing">Facturation</TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
          </TabsList>

          {/* Contrat actuel */}
          <TabsContent value="contract">
            <div className="space-y-6">
              {/* Statut du contrat */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {contract.isFullySigned ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircleIcon className="h-5 w-5 text-yellow-500" />
                        )}
                        {contract.title}
                      </CardTitle>
                      <CardDescription>
                        Version {contract.version} • Type {contract.type}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(contract.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Alertes */}
                  {!contract.isFullySigned && (
                    <Alert>
                      <PenToolIcon className="h-4 w-4" />
                      <AlertDescription>
                        Ce contrat nécessite votre signature électronique pour
                        être activé.
                      </AlertDescription>
                    </Alert>
                  )}

                  {contract.daysUntilExpiry !== undefined &&
                    contract.daysUntilExpiry <= 30 && (
                      <Alert>
                        <ClockIcon className="h-4 w-4" />
                        <AlertDescription>
                          Ce contrat expire dans {contract.daysUntilExpiry}{" "}
                          jours.
                        </AlertDescription>
                      </Alert>
                    )}

                  {/* Détails financiers */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">
                        Taux de commission
                      </Label>
                      <div className="text-2xl font-bold text-blue-600">
                        {contract.commissionRate}%
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">
                        Frais mensuel
                      </Label>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(contract.monthlyFee)}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">
                        Frais d'installation
                      </Label>
                      <div className="text-2xl font-bold text-purple-600">
                        {formatCurrency(contract.setupFee)}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Détails du contrat */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">
                          Période de validité
                        </Label>
                        <div className="text-sm">
                          Du{" "}
                          {contract.validFrom
                            ? format(new Date(contract.validFrom), "PP", {
                                locale: fr,
                              })
                            : "N/A"}
                          {contract.validUntil && (
                            <>
                              {" "}
                              au{" "}
                              {format(new Date(contract.validUntil), "PP", {
                                locale: fr,
                              })}
                            </>
                          )}
                        </div>
                      </div>

                      {contract.maxOrdersPerMonth && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Limite mensuelle
                          </Label>
                          <div className="text-sm">
                            {contract.maxOrdersPerMonth.toLocaleString("fr-FR")}{" "}
                            commandes/mois
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">
                          Renouvellement automatique
                        </Label>
                        <div className="text-sm">
                          {contract.autoRenewal ? "Activé" : "Désactivé"}
                          {contract.autoRenewal && (
                            <> • {contract.renewalPeriod} mois</>
                          )}
                        </div>
                      </div>

                      {contract.maxOrderValue && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Valeur max par commande
                          </Label>
                          <div className="text-sm">
                            {formatCurrency(contract.maxOrderValue)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Signatures */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">
                        Signature commerçant
                      </Label>
                      {contract.merchantSignedAt ? (
                        <div className="flex items-center gap-2">
                          <CheckCircleIcon className="h-4 w-4 text-green-500" />
                          <span className="text-sm">
                            Signé le{" "}
                            {contract.merchantSignedAt &&
                            !isNaN(
                              new Date(contract.merchantSignedAt).getTime(),
                            )
                              ? format(
                                  new Date(contract.merchantSignedAt),
                                  "PPpp",
                                  { locale: fr },
                                )
                              : "Date invalide"}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <ClockIcon className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm">
                            En attente de signature
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">
                        Signature EcoDeli
                      </Label>
                      {contract.adminSignedAt ? (
                        <div className="flex items-center gap-2">
                          <CheckCircleIcon className="h-4 w-4 text-green-500" />
                          <span className="text-sm">
                            Signé le{" "}
                            {contract.adminSignedAt &&
                            !isNaN(new Date(contract.adminSignedAt).getTime())
                              ? format(
                                  new Date(contract.adminSignedAt),
                                  "PPpp",
                                  { locale: fr },
                                )
                              : "Date invalide"}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <ClockIcon className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm">
                            En attente de signature
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-4 pt-4">
                    {!contract.merchantSignedAt && (
                      <Dialog
                        open={signatureDialogOpen}
                        onOpenChange={setSignatureDialogOpen}
                      >
                        <DialogTrigger asChild>
                          <Button>
                            <PenToolIcon className="h-4 w-4 mr-2" />
                            Signer le contrat
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Signature électronique</DialogTitle>
                            <DialogDescription>
                              Veuillez saisir votre nom complet pour signer
                              électroniquement ce contrat.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="signature">
                                Signature électronique
                              </Label>
                              <Input
                                id="signature"
                                placeholder="Votre nom complet"
                                value={signature}
                                onChange={(e) => setSignature(e.target.value)}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setSignatureDialogOpen(false)}
                            >
                              Annuler
                            </Button>
                            <Button
                              onClick={handleSignContract}
                              disabled={signing || !signature.trim()}
                            >
                              {signing ? "Signature..." : "Signer le contrat"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}

                    <Button variant="outline" onClick={downloadContractPDF}>
                      <DownloadIcon className="h-4 w-4 mr-2" />
                      Télécharger PDF
                    </Button>

                    {contract.isFullySigned && (
                      <Dialog
                        open={renewalDialogOpen}
                        onOpenChange={setRenewalDialogOpen}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline">
                            <RefreshCwIcon className="h-4 w-4 mr-2" />
                            Demander un renouvellement
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Demande de renouvellement</DialogTitle>
                            <DialogDescription>
                              Demandez le renouvellement de votre contrat avec
                              d'éventuelles modifications.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="renewalNotes">
                                Notes et demandes spéciales
                              </Label>
                              <Textarea
                                id="renewalNotes"
                                placeholder="Décrivez vos demandes de modification..."
                                value={renewalNotes}
                                onChange={(e) =>
                                  setRenewalNotes(e.target.value)
                                }
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setRenewalDialogOpen(false)}
                            >
                              Annuler
                            </Button>
                            <Button onClick={handleRequestRenewal}>
                              Envoyer la demande
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Facturation */}
          <TabsContent value="billing">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <EuroIcon className="h-5 w-5" />
                    Cycles de facturation
                  </CardTitle>
                  <CardDescription>
                    Historique de vos factures et paiements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {billingCycles.length > 0 ? (
                    <div className="space-y-4">
                      {billingCycles.map((cycle) => (
                        <Card key={cycle.id} className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {cycle.periodStart &&
                                  !isNaN(new Date(cycle.periodStart).getTime())
                                    ? format(
                                        new Date(cycle.periodStart),
                                        "MMM yyyy",
                                        { locale: fr },
                                      )
                                    : "Date invalide"}
                                </span>
                                {getBillingStatusBadge(cycle.status)}
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <div className="text-muted-foreground">
                                    Commandes
                                  </div>
                                  <div className="font-medium">
                                    {cycle.totalOrders}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">
                                    CA
                                  </div>
                                  <div className="font-medium">
                                    {formatCurrency(cycle.totalRevenue)}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">
                                    Commission
                                  </div>
                                  <div className="font-medium">
                                    {formatCurrency(cycle.commissionAmount)}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">
                                    Total facturé
                                  </div>
                                  <div className="font-medium">
                                    {formatCurrency(cycle.totalAmount)}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="text-right text-sm">
                              {cycle.paidAt ? (
                                <div className="text-green-600">
                                  Payé le{" "}
                                  {cycle.paidAt &&
                                  !isNaN(new Date(cycle.paidAt).getTime())
                                    ? format(new Date(cycle.paidAt), "PP", {
                                        locale: fr,
                                      })
                                    : "Date invalide"}
                                </div>
                              ) : cycle.dueDate ? (
                                <div className="text-yellow-600">
                                  Échéance:{" "}
                                  {cycle.dueDate &&
                                  !isNaN(new Date(cycle.dueDate).getTime())
                                    ? format(new Date(cycle.dueDate), "PP", {
                                        locale: fr,
                                      })
                                    : "Date invalide"}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Aucun cycle de facturation disponible
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Historique */}
          <TabsContent value="history">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    Amendements et modifications
                  </CardTitle>
                  <CardDescription>
                    Historique des modifications de contrat
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {amendments.length > 0 ? (
                    <div className="space-y-4">
                      {amendments.map((amendment) => (
                        <Card key={amendment.id} className="p-4">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium">
                                  {amendment.title}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Version {amendment.version}
                                </div>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {amendment.createdAt &&
                                !isNaN(new Date(amendment.createdAt).getTime())
                                  ? format(
                                      new Date(amendment.createdAt),
                                      "PPpp",
                                      { locale: fr },
                                    )
                                  : "Date invalide"}
                              </div>
                            </div>

                            <p className="text-sm">{amendment.description}</p>

                            <div className="flex gap-4 text-sm">
                              {amendment.merchantSignedAt && (
                                <div className="flex items-center gap-1 text-green-600">
                                  <CheckCircleIcon className="h-3 w-3" />
                                  Signé par vous
                                </div>
                              )}
                              {amendment.adminSignedAt && (
                                <div className="flex items-center gap-1 text-green-600">
                                  <CheckCircleIcon className="h-3 w-3" />
                                  Signé par EcoDeli
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Aucun amendement de contrat
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <FileTextIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun contrat trouvé</h3>
            <p className="text-muted-foreground mb-4">
              Vous n'avez pas encore de contrat EcoDeli.
            </p>
            <Button asChild>
              <a href="/merchant/onboarding">
                Commencer le processus d'inscription
              </a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
