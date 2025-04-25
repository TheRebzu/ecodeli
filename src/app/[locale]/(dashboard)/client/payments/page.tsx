import { Metadata } from "next";
import { CreditCard, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Mes paiements",
  description: "Gérez vos moyens de paiement et consultez votre historique",
};

interface PaymentsPageProps {
  params: Promise<{
    locale: string;
  }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function PaymentsPage({
  params,
}: PaymentsPageProps) {
  const { locale } = await params;

  // Récupération des données via TRPC
  const paymentMethods = await api.payment.getUserPaymentMethods.query();
  const recentTransactions = await api.payment.getRecentTransactions.query();
  const paymentStats = await api.payment.getPaymentStats.query();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mes paiements</h1>
        <p className="text-muted-foreground mt-2">
          Gérez vos moyens de paiement et consultez votre historique
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total dépensé
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paymentStats?.totalSpent.toFixed(2) || "0.00"} €</div>
            <p className="text-xs text-muted-foreground">
              {paymentStats?.monthlyChange > 0 ? "+" : ""}{paymentStats?.monthlySpendings.toFixed(2) || "0.00"} € ce mois-ci
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Transactions récentes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions && recentTransactions.length > 0 ? (
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center space-x-4">
                      <Receipt className="h-6 w-6" />
                      <div>
                        <p className="text-sm font-medium leading-none">
                          {transaction.description}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Badge
                        variant={transaction.status === "completed" ? "default" : "secondary"}
                        className="mr-2"
                      >
                        {transaction.status === "completed" ? "Payé" : "En cours"}
                      </Badge>
                      <span className="font-medium">
                        {transaction.amount.toFixed(2)} €
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Vous n&apos;avez pas encore effectué de transactions.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Moyens de paiement</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentMethods && paymentMethods.length > 0 ? (
              <div className="space-y-4">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-4">
                      <CreditCard className="h-6 w-6" />
                      <div>
                        <p className="text-sm font-medium leading-none capitalize">
                          {method.brand} **** {method.last4}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Expire: {method.expiryMonth}/{method.expiryYear}
                        </p>
                      </div>
                    </div>
                    {method.isDefault && (
                      <Badge variant="outline">Par défaut</Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Vous n&apos;avez pas encore ajouté de moyen de paiement.
              </p>
            )}
            <div className="mt-4 text-center">
              <button 
                className="text-sm text-primary hover:underline"
                onClick={() => api.payment.addPaymentMethod.mutate()}
              >
                + Ajouter un moyen de paiement
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
