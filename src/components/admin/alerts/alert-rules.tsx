"use client";

import { useEffect, useState } from "react";
import { 
  AlertTriangle, 
  Bell, 
  Check, 
  ChevronDown, 
  CreditCard, 
  Edit, 
  MoreHorizontal, 
  Package, 
  Plus, 
  Search, 
  Star, 
  Trash, 
  Truck, 
  UserRound 
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { 
  AlertRule, 
  AlertMetricType, 
  AlertCondition 
} from "@/lib/schema/alert.schema";
import { 
  getAlertRules, 
  updateAlertRule, 
  deleteAlertRule 
} from "@/lib/actions/alerts.action";
import { AlertRuleForm } from "./alert-rule-form";
import { Skeleton } from "@/components/ui/skeleton";

export function AlertRules() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const result = await getAlertRules();
      if (result) {
        setRules(result);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des règles d'alerte:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const filteredRules = rules.filter(rule => 
    rule.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      await updateAlertRule(id, { enabled });
      setRules(rules.map(rule => 
        rule.id === id ? { ...rule, enabled } : rule
      ));
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la règle:", error);
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      const confirmed = window.confirm("Êtes-vous sûr de vouloir supprimer cette règle d'alerte ?");
      if (!confirmed) return;
      
      await deleteAlertRule(id);
      setRules(rules.filter(rule => rule.id !== id));
    } catch (error) {
      console.error("Erreur lors de la suppression de la règle:", error);
    }
  };

  const getMetricIcon = (type: AlertMetricType) => {
    switch (type) {
      case "REVENUE":
        return <CreditCard className="h-4 w-4" />;
      case "SHIPMENTS":
        return <Truck className="h-4 w-4" />;
      case "USERS":
        return <UserRound className="h-4 w-4" />;
      case "SATISFACTION":
        return <Star className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getMetricLabel = (type: AlertMetricType) => {
    switch (type) {
      case "REVENUE":
        return "Revenus";
      case "SHIPMENTS":
        return "Livraisons";
      case "USERS":
        return "Utilisateurs";
      case "SATISFACTION":
        return "Satisfaction";
      case "COURIER_DELAY":
        return "Retards livreurs";
      default:
        return type;
    }
  };

  const getConditionLabel = (condition: AlertCondition) => {
    switch (condition) {
      case "ABOVE":
        return "Au-dessus de";
      case "BELOW":
        return "En-dessous de";
      case "EQUAL":
        return "Égal à";
      case "CHANGE_RATE":
        return "Taux de variation";
      default:
        return condition;
    }
  };

  if (loading && rules.length === 0) {
    return <AlertRulesSkeleton />;
  }

  return (
    <div className="space-y-6">
      {isFormOpen ? (
        <div className="mb-6">
          <AlertRuleForm 
            onCancel={() => setIsFormOpen(false)} 
            onSuccess={() => {
              setIsFormOpen(false);
              fetchRules();
            }}
          />
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Règles d'alerte</h2>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle règle
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher une règle..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom de la règle</TableHead>
                <TableHead>Métrique</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Seuil</TableHead>
                <TableHead>Notification</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <AlertTriangle className="h-8 w-8 mb-2 opacity-20" />
                      <p>Aucune règle d'alerte trouvée</p>
                      {searchTerm && (
                        <Button 
                          variant="link" 
                          onClick={() => setSearchTerm("")}
                          className="mt-1"
                        >
                          Effacer la recherche
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRules.map(rule => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getMetricIcon(rule.metricType)}
                        {getMetricLabel(rule.metricType)}
                      </div>
                    </TableCell>
                    <TableCell>{getConditionLabel(rule.condition)}</TableCell>
                    <TableCell>{rule.threshold}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {rule.notifyEmail && (
                          <Badge variant="outline">Email</Badge>
                        )}
                        {rule.notifyDashboard && (
                          <Badge variant="outline">Dashboard</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(checked) => handleToggleEnabled(rule.id || "", checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => handleDeleteRule(rule.id || "")}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash className="h-4 w-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function AlertRulesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-36" />
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-10 w-80" />
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex justify-between">
              <Skeleton className="h-5 w-full max-w-[100px]" />
              <Skeleton className="h-5 w-full max-w-[80px]" />
              <Skeleton className="h-5 w-full max-w-[100px]" />
              <Skeleton className="h-5 w-full max-w-[60px]" />
              <Skeleton className="h-5 w-full max-w-[100px]" />
              <Skeleton className="h-5 w-full max-w-[80px]" />
              <Skeleton className="h-5 w-full max-w-[40px]" />
            </div>

            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center py-3">
                <Skeleton className="h-5 w-full max-w-[120px]" />
                <Skeleton className="h-5 w-full max-w-[100px]" />
                <Skeleton className="h-5 w-full max-w-[120px]" />
                <Skeleton className="h-5 w-full max-w-[40px]" />
                <Skeleton className="h-5 w-full max-w-[80px]" />
                <Skeleton className="h-5 w-[36px]" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 