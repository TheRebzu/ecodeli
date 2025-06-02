import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ActivityReportProps {
  data: any; // TODO: Define proper data type
}

export function ActivityReport({ data }: ActivityReportProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rapport d'activité</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Contenu du rapport d'activité */}
      </CardContent>
    </Card>
  );
}