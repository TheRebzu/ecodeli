import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DeliveryStatisticsProps {
  data: any; // TODO: Define proper data type
}

export function DeliveryStatistics({ data }: DeliveryStatisticsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Statistiques de livraison</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Statistiques sur les livraisons */}
      </CardContent>
    </Card>
  );
}