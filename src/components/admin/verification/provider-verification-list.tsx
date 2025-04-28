'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';
import { VerificationStatus } from '@prisma/client';

type Verification = {
  id: string;
  status: VerificationStatus;
  document: {
    id: string;
    type: string;
    filename: string;
  };
  submitter: {
    id: string;
    name: string;
    email: string;
  };
};

type ProviderVerificationListProps = {
  verifications: Verification[];
};

export function ProviderVerificationList({ verifications }: ProviderVerificationListProps) {
  const [activeTab, setActiveTab] = useState('pending');

  const pendingVerifications = verifications.filter(
    verification => verification.status === 'PENDING'
  );

  const renderPendingVerifications = () => {
    if (!pendingVerifications || pendingVerifications.length === 0) {
      return (
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-center text-muted-foreground">Aucune vérification en attente</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return pendingVerifications.map(verification => (
      <Card key={verification.id} className="mb-4">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">{verification.submitter.name}</h3>
              <p className="text-sm text-muted-foreground">{verification.document.type}</p>
            </div>
            <Badge>En attente</Badge>
          </div>
        </CardContent>
      </Card>
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium">Documents des prestataires</h2>
        {pendingVerifications && pendingVerifications.length > 0 && (
          <Badge variant="secondary">{pendingVerifications.length} en attente</Badge>
        )}
      </div>

      <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">En attente</TabsTrigger>
          <TabsTrigger value="approved">Approuvés</TabsTrigger>
          <TabsTrigger value="rejected">Rejetés</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {renderPendingVerifications()}
        </TabsContent>

        <TabsContent value="approved" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Documents approuvés</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground">Fonctionnalité à implémenter</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Documents rejetés</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground">Fonctionnalité à implémenter</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
