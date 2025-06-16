"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger} from "@/components/ui/popover";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CalendarIcon,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw} from "lucide-react";
import { format, isToday, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import useBilling from "@/hooks/payment/use-billing";
import { cn } from "@/lib/utils/common";

/**
 * Tableau de bord de facturation pour les administrateurs
 * Permet de gérer les cycles de facturation, les rappels et les statistiques
 */
export default function BillingDashboard() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);

  const {
    isLoading,
    billingStats,
    isLoadingStats,
    runMonthlyBilling,
    scheduleMonthlyCycles,
    executeScheduledCycles,
    sendPaymentReminders,
    processAutomaticPayouts,
    formatBillingPeriod} = useBilling();

  // Calculer les périodes de facturation
  const currentMonthStart = startOfMonth(new Date());
  const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
  const lastMonthEnd = endOfMonth(lastMonthStart);
  const billingPeriod = formatBillingPeriod(lastMonthStart, lastMonthEnd);

  const handleScheduleForDate = () => {
    scheduleMonthlyCycles(selectedDate);
    setShowCalendar(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tableau de bord de facturation</h1>
        <div className="flex gap-2">
          <Popover open={showCalendar} onOpenChange={setShowCalendar}>
            <PopoverTrigger asChild>
              <Button variant="outline" onClick={() => setShowCalendar(true)}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                Planifier pour{" "}
                {format(selectedDate, "dd MMMM yyyy", { locale })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
              <div className="p-3 border-t flex justify-end">
                <Button size="sm" onClick={handleScheduleForDate}>
                  Planifier
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Alert variant={isToday(currentMonthStart) ? "destructive" : "default"}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Période de facturation</AlertTitle>
        <AlertDescription>
          La facturation mensuelle concerne la période:{" "}
          <strong>{billingPeriod}</strong>
          {isToday(currentMonthStart) && (
            <p className="mt-1 font-semibold">
              Nous sommes au début du mois! Il est temps de lancer la
              facturation mensuelle.
            </p>
          )}
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Statistiques */}
        <Card>
          <CardHeader>
            <CardTitle>Statistiques</CardTitle>
            <CardDescription>Vue d'ensemble de la facturation</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Cycles</p>
                    <p className="text-2xl font-bold">
                      {billingStats?.cycleStats?.COMPLETED || 0}
                      <span className="text-sm text-muted-foreground ml-1">
                        terminés
                      </span>
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Montant</p>
                    <p className="text-2xl font-bold">
                      {new Intl.NumberFormat("fr-FR", {
                        style: "currency",
                        currency: "EUR"}).format(billingStats?.totalBilled || 0)}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm">En attente</span>
                    <span className="font-medium">
                      {billingStats?.cycleStats?.PENDING || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">En traitement</span>
                    <span className="font-medium">
                      {billingStats?.cycleStats?.PROCESSING || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Échoués</span>
                    <span className="font-medium">
                      {billingStats?.cycleStats?.FAILED || 0}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => (window.location.href = "/admin/billing/reports")}
            >
              Voir tous les rapports
            </Button>
          </CardFooter>
        </Card>

        {/* Actions principales */}
        <Card>
          <CardHeader>
            <CardTitle>Actions planifiées</CardTitle>
            <CardDescription>Gérer la facturation automatique</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Button
                variant="default"
                className="w-full"
                onClick={() => runMonthlyBilling()}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Lancer la facturation mensuelle
              </Button>

              <Button
                variant="secondary"
                className="w-full"
                onClick={() => scheduleMonthlyCycles()}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Planifier les cycles (aujourd'hui)
              </Button>

              <Button
                variant="secondary"
                className="w-full"
                onClick={() => executeScheduledCycles()}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Exécuter les cycles planifiés
              </Button>
            </div>

            <div className="rounded-md bg-muted p-3">
              <p className="text-sm text-muted-foreground">
                Ces actions peuvent prendre plusieurs minutes selon le nombre
                d'utilisateurs.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="text-xs text-muted-foreground">
              Jour configuré: {process.env.MONTHLY_BILLING_DAY || "1"} du mois
            </div>
          </CardFooter>
        </Card>

        {/* Actions secondaires */}
        <Card>
          <CardHeader>
            <CardTitle>Actions supplémentaires</CardTitle>
            <CardDescription>Rappels et virements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => sendPaymentReminders()}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Envoyer rappels factures impayées
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => processAutomaticPayouts()}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Traiter virements automatiques
            </Button>
          </CardContent>
          <CardFooter>
            <div className="text-xs text-muted-foreground w-full">
              Ces opérations sont normalement exécutées par le CRON mais peuvent
              être lancées manuellement.
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Statuts des cycles récents */}
      <Card>
        <CardHeader>
          <CardTitle>Cycles de facturation récents</CardTitle>
          <CardDescription>
            Suivre l'état des cycles de facturation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {isLoadingStats ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : billingStats?.cycleStats &&
              Object.keys(billingStats.cycleStats).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(billingStats.cycleStats).map(
                  ([status, count]) => (
                    <div
                      key={status}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-2">
                        {status === "COMPLETED" && (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                        {status === "FAILED" && (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        {status === "PROCESSING" && (
                          <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
                        )}
                        {status === "PENDING" && (
                          <AlertCircle className="h-5 w-5 text-yellow-500" />
                        )}
                        <span className="font-medium">
                          {status === "COMPLETED" && "Terminés"}
                          {status === "FAILED" && "Échoués"}
                          {status === "PROCESSING" && "En traitement"}
                          {status === "PENDING" && "En attente"}
                        </span>
                      </div>
                      <Badge
                        variant={
                          status === "COMPLETED"
                            ? "default"
                            : status === "FAILED"
                              ? "destructive"
                              : status === "PROCESSING"
                                ? "secondary"
                                : "outline"
                        }
                      >
                        {count}
                      </Badge>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                Aucun cycle de facturation trouvé pour cette période.
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => (window.location.href = "/admin/billing/cycles")}
          >
            Gérer les cycles de facturation
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
