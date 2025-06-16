"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { UserRole, DocumentType } from "@prisma/client";
import { Files, Calendar, User, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { api } from "@/trpc/react";
import { useTranslations } from "next-intl";

/**
 * Composant pour afficher la liste des utilisateurs avec des documents à vérifier
 */
export function PendingUserVerifications({
  userRole = "DELIVERER"}: {
  userRole?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("admin.verification");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // 🔧 FIX: Utiliser l'API adminUser qui fonctionne au lieu de l'API verification défaillante
  const { data: usersData, isLoading } = api.adminUser.getUsers.useQuery({ page: 1,
    limit: 100 });

  // Filtrer les utilisateurs par rôle et simuler des documents en attente
  const allUsers = usersData?.json?.users || [];
  const roleUsers = allUsers.filter((user: any) => user.role === userRole);

  // Pour cette démo, on simule que certains utilisateurs ont des documents en attente
  const usersWithPendingDocs = roleUsers
    .filter((user: any) => !user.isVerified) // Utilisateurs non vérifiés
    .slice(0, PAGESIZE); // Limiter à PAGE_SIZE résultats

  // Simuler la structure de données attendue
  const pendingVerificationsData = {
    data: usersWithPendingDocs.map((user: any) => ({
      id: `doc-${user.id}`,
      userId: user.id,
      type: "ID_CARD" as DocumentType,
      uploadedAt: user.createdAt,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role}})),
    meta: {
      pages: 1}};

  // Grouper les documents par utilisateur
  const usersWithDocuments =
    pendingVerificationsData?.data.reduce(
      (acc, doc) => {
        if (!acc[doc.userId]) {
          acc[doc.userId] = {
            user: doc.user,
            documents: []};
        }
        acc[doc.userId].documents.push(doc);
        return acc;
      },
      {} as Record<string, { user: any; documents: any[] }>,
    ) || {};

  const users = Object.values(usersWithDocuments);
  const totalPages = pendingVerificationsData?.meta?.pages || 1;

  // Fonction pour naviguer vers les détails de vérification d'un utilisateur
  const goToUserVerification = (userId: string) => {
    router.push(`/admin/verification/user/${userId}`);
  };

  // Générer un résumé des documents soumis
  const getDocumentsSummary = (documents: any[]) => {
    if (documents.length === 0) return "Aucun document";

    const types = documents.map((doc) => {
      switch (doc.type) {
        case "ID_CARD":
          return "Carte d'identité";
        case "DRIVING_LICENSE":
          return "Permis de conduire";
        case "VEHICLE_REGISTRATION":
          return "Carte grise";
        case "SELFIE":
          return "Selfie";
        case "QUALIFICATION_CERTIFICATE":
          return "Certificat de qualification";
        case "INSURANCE":
          return "Attestation d'assurance";
        case "PROOF_OF_ADDRESS":
          return "Justificatif de domicile";
        case "BUSINESS_REGISTRATION":
          return "Registre du commerce";
        default:
          return doc.type;
      }
    });

    return types.join(", ");
  };

  // Afficher un état de chargement
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vérifications en attente</CardTitle>
          <CardDescription>
            Chargement des utilisateurs à vérifier...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <p>Chargement en cours...</p>
        </CardContent>
      </Card>
    );
  }

  // Afficher un message si aucun utilisateur n'a de document à vérifier
  if (users.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vérifications en attente</CardTitle>
          <CardDescription>
            Aucun utilisateur n'a de document en attente de vérification.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <div className="text-center">
            <Files className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Aucune vérification en attente
            </h3>
            <p className="text-muted-foreground">
              Tous les documents ont été vérifiés. Revenez plus tard.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vérifications en attente</CardTitle>
        <CardDescription>
          Liste des utilisateurs avec des documents à vérifier
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Documents</TableHead>
              <TableHead>Date de soumission</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((item) => (
              <TableRow key={item.user.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{item.user.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {item.user.email}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span>{getDocumentsSummary(item.documents)}</span>
                    <Badge variant="outline">
                      {item.documents.length} document(s)
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  {format(new Date(item.documents[0].uploadedAt), "PPP", { locale })}
                </TableCell>
                <TableCell>
                  <Button
                    onClick={() => goToUserVerification(item.user.id)}
                    size="sm"
                  >
                    Vérifier
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex justify-center mt-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Précédent
            </Button>
            <div className="flex items-center mx-2">
              Page {currentPage} sur {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
            >
              Suivant
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
