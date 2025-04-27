"use client";

import { useState } from "react";
import { trpc } from "@/app/_trpc/client";
import { DocumentVerification } from "@/components/admin/document-verification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { UserRole } from "@prisma/client";

type Verification = {
  id: string;
  status: string;
  requestedAt: Date;
  verifiedAt: Date | null;
  document: {
    id: string;
    type: string;
    filename: string;
    fileUrl: string;
    mimeType: string;
    uploadedAt: Date;
    isVerified: boolean;
  };
  submitter: {
    id: string;
    name: string;
    email: string;
    provider: {
      id: string;
      isVerified: boolean;
    } | null;
  };
};

export function ProviderVerificationList({ 
  verifications = [] 
}: { 
  verifications?: Verification[] 
}) {
  const [activeTab, setActiveTab] = useState("pending");
  
  const {
    data: pendingVerifications,
    isLoading,
    refetch,
  } = trpc.verification.getPendingVerifications.useQuery(
    { userRole: "PROVIDER" as UserRole },
    {
      initialData: activeTab === "pending" ? verifications : undefined,
      enabled: activeTab === "pending"
    }
  );
  
  const handleVerificationComplete = async () => {
    await refetch();
  };

  const renderPendingVerifications = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!pendingVerifications || pendingVerifications.length === 0) {
      return (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Aucune vérification en attente
            </p>
          </CardContent>
        </Card>
      );
    }

    return pendingVerifications.map((verification) => (
      <DocumentVerification
        key={verification.id}
        document={{
          ...verification.document,
          submitter: verification.submitter,
        }}
        onVerify={handleVerificationComplete}
      />
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
              <p className="text-center text-muted-foreground">
                Fonctionnalité à implémenter
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Documents rejetés</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground">
                Fonctionnalité à implémenter
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 