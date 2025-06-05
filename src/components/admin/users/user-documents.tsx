import { useState } from 'react';
import { format } from 'date-fns';
import { FileText, Download, Eye, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import { DocumentType, DocumentStatus } from '@prisma/client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/trpc/react';
import { DocumentList, DocumentPreview } from '@/components/shared/documents';
import { Checkbox } from '@/components/ui/checkbox';

// Fix toast notifications
const showToast = (title: string, variant: 'default' | 'destructive' | 'success') => {
  toast({
    title,
    variant,
  });
};

// Fix type mismatch for UserDocument
interface UserDocument {
  id: string;
  type: DocumentType; // Updated to use Prisma type
  status: DocumentStatus; // Updated to use Prisma type
  createdAt: Date;
  updatedAt: Date;
  fileUrl: string;
  filename?: string;
  mimeType?: string;
}

interface UserDocumentsProps {
  documents: UserDocument[];
  isLoading: boolean;
  onApproveDocument: (documentId: string, reason?: string) => void;
  onRejectDocument: (documentId: string, reason?: string) => void;
}

export function UserDocuments({
  documents,
  isLoading,
  onApproveDocument,
  onRejectDocument,
}: UserDocumentsProps) {
  const [selectedDocument, setSelectedDocument] = useState<UserDocument | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const { toast } = useToast();

  const handleReviewDocument = () => {
    if (!selectedDocument) return;

    if (reviewStatus === 'APPROVED') {
      onApproveDocument(selectedDocument.id);
    } else if (reviewStatus === 'REJECTED') {
      onRejectDocument(selectedDocument.id, rejectionReason);
    }

    setIsReviewOpen(false);
    setRejectionReason('');
  };

  const openDocumentPreview = (document: UserDocument) => {
    setSelectedDocument(document);
    setIsPreviewOpen(true);
  };

  const openDocumentReview = (document: UserDocument) => {
    setSelectedDocument(document);
    setReviewStatus('APPROVED');
    setRejectionReason('');
    setIsReviewOpen(true);
  };

  // Correct the downloadDocument logic to use tRPC's fetch method
  const downloadDocument = async (document: UserDocument) => {
    try {
      toast({ title: 'Préparation du document', variant: 'default' });

      const result = await api.document.downloadDocument.query({ filePath: document.fileUrl });

      const binaryData = atob(result.fileData);
      const bytes = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: result.contentType });

      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.setAttribute('download', result.fileName);
      window.document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        window.document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);

      toast({ title: 'Téléchargement lancé', variant: 'success' });
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      toast({ title: 'Impossible de télécharger le document.', variant: 'destructive' });
    }
  };

  const toggleDocumentSelection = (documentId: string) => {
    setSelectedDocuments(prev =>
      prev.includes(documentId) ? prev.filter(id => id !== documentId) : [...prev, documentId]
    );
  };

  const handleBulkApprove = () => {
    selectedDocuments.forEach(documentId => onApproveDocument(documentId));
    setSelectedDocuments([]);
  };

  const handleBulkReject = (reason: string) => {
    selectedDocuments.forEach(documentId => onRejectDocument(documentId, reason));
    setSelectedDocuments([]);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-[180px] mb-2" />
          <Skeleton className="h-4 w-[250px]" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Documents</CardTitle>
        <CardDescription>ID verification and supporting documents</CardDescription>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">No documents available.</div>
        ) : (
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Checkbox
                      onChange={e => {
                        const target = e.target as HTMLInputElement;
                        if (target.checked) {
                          setSelectedDocuments(documents.map(doc => doc.id));
                        } else {
                          setSelectedDocuments([]);
                        }
                      }}
                      checked={selectedDocuments.length === documents.length}
                    />
                  </TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map(doc => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <Checkbox
                        onChange={() => toggleDocumentSelection(doc.id)}
                        checked={selectedDocuments.includes(doc.id)}
                      />
                    </TableCell>
                    <TableCell>{doc.type.toString()}</TableCell>
                    <TableCell>{doc.status}</TableCell>
                    <TableCell>
                      <button onClick={() => openDocumentPreview(doc)}>View</button>
                      <button onClick={() => openDocumentReview(doc)}>Review</button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <button onClick={handleBulkApprove}>Approve Selected</button>
            <button
              onClick={() => {
                const reason = prompt('Enter rejection reason:');
                if (reason) handleBulkReject(reason);
              }}
            >
              Reject Selected
            </button>
          </div>
        )}
      </CardContent>

      {selectedDocument && (
        <DocumentPreview document={selectedDocument} onClose={() => setIsPreviewOpen(false)} />
      )}

      {isReviewOpen && (
        <AlertDialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Review Document</AlertDialogTitle>
              <AlertDialogDescription>
                {selectedDocument && `Update the verification status for this document.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Tabs
              defaultValue="approve"
              value={reviewStatus}
              onValueChange={v => setReviewStatus(v as any)}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="APPROVED">Approve</TabsTrigger>
                <TabsTrigger value="REJECTED">Reject</TabsTrigger>
              </TabsList>
              <TabsContent value="APPROVED" className="mt-4">
                <Label>Document is valid and readable</Label>
              </TabsContent>
              <TabsContent value="REJECTED" className="mt-4">
                <Textarea
                  placeholder="Please provide a reason for rejection"
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                />
              </TabsContent>
            </Tabs>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleReviewDocument}
                disabled={reviewStatus === 'REJECTED' && !rejectionReason}
              >
                {reviewStatus === 'APPROVED' ? 'Approve Document' : 'Reject Document'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Card>
  );
}
