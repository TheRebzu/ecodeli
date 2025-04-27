"use client";

import { useState } from "react";
import { trpc } from "@/app/_trpc/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle, XCircle, FileText } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import Image from "next/image";

type DocumentVerificationProps = {
  document: {
    id: string;
    type: string;
    filename: string;
    fileUrl: string;
    mimeType: string;
    uploadedAt: Date;
    isVerified: boolean;
    submitter: {
      id: string;
      name: string;
      email: string;
    };
  };
  onVerify: () => void;
};

export function DocumentVerification({ document, onVerify }: DocumentVerificationProps) {
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const { toast } = useToast();

  const reviewDocument = trpc.verification.reviewDocument.useMutation({
    onSuccess: () => {
      toast({
        title: "Document traité",
        description: "Le document a été vérifié avec succès",
      });
      setIsReviewDialogOpen(false);
      onVerify();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la vérification",
      });
    },
  });

  const handleApprove = () => {
    reviewDocument.mutate({
      documentId: document.id,
      status: "APPROVED",
      notes,
    });
  };

  const handleReject = () => {
    if (!notes) {
      toast({
        variant: "destructive",
        title: "Notes requises",
        description: "Veuillez indiquer la raison du rejet",
      });
      return;
    }

    reviewDocument.mutate({
      documentId: document.id,
      status: "REJECTED",
      notes,
    });
  };

  const isLoading = reviewDocument.isLoading;
  const isImage = document.mimeType.startsWith("image/");

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{document.type.replace("_", " ")}</span>
          {document.isVerified && (
            <CheckCircle className="text-green-500" size={20} />
          )}
        </CardTitle>
        <CardDescription>
          Soumis par {document.submitter.name} le{" "}
          {format(new Date(document.uploadedAt), "dd/MM/yyyy à HH:mm")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 items-start">
          <div className="flex-1">
            <h4 className="font-medium mb-2">Informations du document</h4>
            <ul className="space-y-1 text-sm">
              <li>
                <span className="font-medium">Fichier:</span> {document.filename}
              </li>
              <li>
                <span className="font-medium">Type:</span> {document.mimeType}
              </li>
              <li>
                <span className="font-medium">Utilisateur:</span> {document.submitter.email}
              </li>
            </ul>
          </div>
          <div className="flex-1">
            <h4 className="font-medium mb-2">Aperçu</h4>
            <div className="overflow-hidden border rounded-md">
              {isImage ? (
                <div className="relative h-[200px] w-full">
                  <Image
                    src={document.fileUrl}
                    alt={document.filename}
                    fill
                    style={{ objectFit: "contain" }}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 px-4 bg-muted">
                  <FileText size={48} className="text-muted-foreground mb-2" />
                  <a
                    href={document.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                  >
                    Voir le document
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">Vérifier le document</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Vérification du document</DialogTitle>
              <DialogDescription>
                Examinez le document et décidez s'il doit être approuvé ou rejeté.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <h4 className="font-medium mb-2">Notes (obligatoire si rejeté)</h4>
              <Textarea
                placeholder="Ajoutez des notes concernant la vérification..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="destructive"
                onClick={handleReject}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="mr-2 h-4 w-4" />
                )}
                Rejeter
              </Button>
              <Button
                type="button"
                variant="default"
                onClick={handleApprove}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Approuver
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
