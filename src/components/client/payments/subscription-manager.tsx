import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SubscriptionManagerProps {
  currentPlan?: string;
  onUpgrade?: () => void;
  onCancel?: () => void;
}

export function SubscriptionManager({
  currentPlan = "Free",
  onUpgrade,
  onCancel,
}: SubscriptionManagerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Abonnement actuel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>
          Plan actuel: <strong>{currentPlan}</strong>
        </p>
        <div className="flex gap-2">
          <Button onClick={onUpgrade} variant="default">
            Mettre à niveau
          </Button>
          <Button onClick={onCancel} variant="outline">
            Annuler l'abonnement
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
