'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Page() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Titre de la page</CardTitle>
          <CardDescription>Description de la page</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Contenu de la page</p>
        </CardContent>
      </Card>
    </div>
  );
}

