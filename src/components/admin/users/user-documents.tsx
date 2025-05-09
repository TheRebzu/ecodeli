import { useState } from 'react';
import { format } from 'date-fns';
import { FileText, Download, Eye, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';

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

interface UserDocument {
  id: string;
  type: string;
  status: string;
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
  onRejectDocument: (documentId: string, reason: string) => void;
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
  const { toast } = useToast();

  // Function to display document type in a readable format
  const formatDocumentType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

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

  const downloadDocument = async (document: UserDocument) => {
    try {
      toast({
        title: 'Préparation du document',
        description: 'Le téléchargement va commencer...'
      });

      // Utiliser la nouvelle API de téléchargement avec le bon type MIME
      const downloadUrl = `/api/download?path=${encodeURIComponent(document.fileUrl)}&download=true`;
      
      // Créer un élément de lien temporaire pour le téléchargement
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Extraire le nom de fichier
      const fileName = document.filename || document.fileUrl.split('/').pop() || `document-${document.id}`;
      link.setAttribute('download', fileName);
      
      // Déclencher le téléchargement
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Téléchargement lancé',
        description: `Le document est en cours de téléchargement.`,
      });
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      toast({
        title: 'Erreur de téléchargement',
        description: 'Impossible de télécharger le document.',
        variant: 'destructive',
      });
    }
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map(document => (
                <TableRow key={document.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {formatDocumentType(document.type)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {document.status === 'APPROVED' ? (
                      <Badge className="bg-green-500">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Approved
                      </Badge>
                    ) : document.status === 'REJECTED' ? (
                      <Badge className="bg-red-500">
                        <XCircle className="mr-1 h-3 w-3" />
                        Rejected
                      </Badge>
                    ) : document.status === 'EXPIRED' ? (
                      <Badge className="bg-orange-500">
                        <AlertCircle className="mr-1 h-3 w-3" />
                        Expired
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-500">
                        <Clock className="mr-1 h-3 w-3" />
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{format(new Date(document.createdAt), 'MMM d, yyyy')}</TableCell>
                  <TableCell>{format(new Date(document.updatedAt), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDocumentPreview(document)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>

                      <Button variant="ghost" size="sm" onClick={() => downloadDocument(document)}>
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>

                      {document.status === 'PENDING' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDocumentReview(document)}
                          className="text-primary"
                        >
                          Review
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Document Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedDocument && formatDocumentType(selectedDocument.type)}
            </DialogTitle>
            <DialogDescription>
              {selectedDocument &&
                `Uploaded on ${format(new Date(selectedDocument.createdAt), 'MMMM d, yyyy')}`}
            </DialogDescription>
          </DialogHeader>

          <div className="w-full h-[60vh] flex items-center justify-center bg-muted rounded-md overflow-hidden">
            {selectedDocument && selectedDocument.fileUrl ? (
              selectedDocument.fileUrl.endsWith('.pdf') ? (
                <iframe
                  src={`${selectedDocument.fileUrl}#toolbar=0`}
                  className="w-full h-full"
                  title={`Document ${selectedDocument.id}`}
                />
              ) : (
                <img
                  src={selectedDocument.fileUrl}
                  alt={`Document ${selectedDocument.id}`}
                  className="max-w-full max-h-full object-contain"
                />
              )
            ) : (
              <div className="text-muted-foreground">No preview available</div>
            )}
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Close
            </Button>

            {selectedDocument && (
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedDocument) downloadDocument(selectedDocument);
                }}
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            )}

            {selectedDocument && selectedDocument.status === 'PENDING' && (
              <Button
                variant="default"
                onClick={() => {
                  setIsPreviewOpen(false);
                  openDocumentReview(selectedDocument);
                }}
              >
                Review Document
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Review AlertDialog */}
      <AlertDialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Review Document</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedDocument &&
                `Update the verification status for this ${formatDocumentType(selectedDocument.type)}`}
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
              <RadioGroup defaultValue="valid" className="space-y-3">
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="valid" id="valid" className="mt-1" />
                  <div className="grid gap-1.5">
                    <Label htmlFor="valid">Document is valid and readable</Label>
                    <p className="text-sm text-muted-foreground">
                      The document meets all requirements and verification standards.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </TabsContent>

            <TabsContent value="REJECTED" className="mt-4 space-y-4">
              <RadioGroup defaultValue="invalid" className="space-y-3">
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="invalid" id="invalid" className="mt-1" />
                  <div className="grid gap-1.5">
                    <Label htmlFor="invalid">Document is invalid or unreadable</Label>
                    <p className="text-sm text-muted-foreground">
                      There are issues with the document quality or authenticity.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="expired" id="expired" className="mt-1" />
                  <div className="grid gap-1.5">
                    <Label htmlFor="expired">Document is expired</Label>
                    <p className="text-sm text-muted-foreground">
                      The document is no longer valid due to expiration.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="wrong-type" id="wrong-type" className="mt-1" />
                  <div className="grid gap-1.5">
                    <Label htmlFor="wrong-type">Wrong document type</Label>
                    <p className="text-sm text-muted-foreground">
                      The document doesn't match the required type.
                    </p>
                  </div>
                </div>
              </RadioGroup>

              <div className="space-y-2">
                <Label htmlFor="rejection-reason">Rejection Reason</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Please provide a reason for rejection"
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
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
    </Card>
  );
}
