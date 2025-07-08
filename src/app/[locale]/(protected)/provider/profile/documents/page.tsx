"use client";

import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/layout/page-header";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  FileText, 
  Upload, 
  Download,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Plus,
  Image,
  File
} from "lucide-react";

interface Document {
  id: string;
  type: 'IDENTITY' | 'DRIVING_LICENSE' | 'INSURANCE' | 'CERTIFICATION' | 'CONTRACT';
  filename: string;
  url: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  uploadedAt: string;
  validatedAt?: string;
  validatedBy?: string;
  rejectionReason?: string;
  fileSize: number;
  mimeType: string;
}

interface DocumentType {
  key: string;
  label: string;
  description: string;
  required: boolean;
  acceptedFormats: string[];
  maxSize: number;
}

const documentTypes: DocumentType[] = [
  {
    key: 'IDENTITY',
    label: 'Pièce d\'identité',
    description: 'Carte d\'identité, passeport ou permis de conduire',
    required: true,
    acceptedFormats: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSize: 5 * 1024 * 1024 // 5MB
  },
  {
    key: 'INSURANCE',
    label: 'Assurance responsabilité civile',
    description: 'Attestation d\'assurance professionnelle',
    required: true,
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSize: 10 * 1024 * 1024 // 10MB
  },
  {
    key: 'CERTIFICATION',
    label: 'Certifications professionnelles',
    description: 'Diplômes, certificats ou formations',
    required: false,
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSize: 10 * 1024 * 1024 // 10MB
  }
];

export default function ProviderDocumentsPage() {
  const { user } = useAuth();
  const t = useTranslations("provider.documents");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!user?.id) return;
      
      try {
        const response = await fetch(`/api/provider/profile/documents?userId=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setDocuments(data.documents || []);
        }
      } catch (error) {
        console.error("Error fetching documents:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [user]);

  const handleFileUpload = async (file: File, documentType: string) => {
    if (!user?.id) return;

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', documentType);
    formData.append('userId', user.id);

    try {
      const response = await fetch('/api/provider/profile/documents/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const newDocument = await response.json();
        setDocuments(prev => [...prev, newDocument]);
      }
    } catch (error) {
      console.error("Error uploading document:", error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/provider/profile/documents/${documentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      }
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800">Approuvé</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">Rejeté</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800">En attente</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    } else if (mimeType === 'application/pdf') {
      return <FileText className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const calculateCompletionRate = () => {
    const requiredTypes = documentTypes.filter(type => type.required);
    const completedRequired = requiredTypes.filter(type => 
      documents.some(doc => doc.type === type.key && doc.status === 'APPROVED')
    );
    return Math.round((completedRequired.length / requiredTypes.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Chargement des documents...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <p>Vous devez être connecté pour accéder à cette page.</p>
      </div>
    );
  }

  const completionRate = calculateCompletionRate();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes Documents"
        description="Gérez vos documents requis pour la validation de votre compte"
      />

      {/* Completion Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Statut de Vérification
          </CardTitle>
          <CardDescription>
            Progression de la validation de vos documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Documents obligatoires</span>
              <span className="text-sm text-muted-foreground">{completionRate}% complété</span>
            </div>
            <Progress value={completionRate} className="w-full" />
            
            {completionRate === 100 ? (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Tous vos documents obligatoires ont été approuvés! Votre compte est entièrement vérifié.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Veuillez télécharger et faire valider tous vos documents obligatoires pour activer pleinement votre compte.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Document Types */}
      <div className="space-y-6">
        {documentTypes.map((docType) => {
          const userDocuments = documents.filter(doc => doc.type === docType.key);
          const hasApprovedDoc = userDocuments.some(doc => doc.status === 'APPROVED');

          return (
            <Card key={docType.key}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {docType.label}
                      {docType.required && (
                        <Badge variant="outline" className="text-xs">Obligatoire</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{docType.description}</CardDescription>
                  </div>
                  {hasApprovedDoc && (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Existing Documents */}
                  {userDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getFileIcon(doc.mimeType)}
                        <div>
                          <p className="font-medium">{doc.filename}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(doc.fileSize)} • {new Date(doc.uploadedAt).toLocaleDateString('fr-FR')}
                          </p>
                          {doc.rejectionReason && (
                            <p className="text-sm text-red-600 mt-1">{doc.rejectionReason}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(doc.status)}
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                        {doc.status !== 'APPROVED' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteDocument(doc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Upload Section */}
                  {!hasApprovedDoc && (
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                      <div className="text-center space-y-4">
                        <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Télécharger {docType.label}</p>
                          <p className="text-xs text-muted-foreground">
                            Formats acceptés: {docType.acceptedFormats.join(', ')} • 
                            Taille max: {formatFileSize(docType.maxSize)}
                          </p>
                        </div>
                        <Input
                          type="file"
                          accept={docType.acceptedFormats.join(',')}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileUpload(file, docType.key);
                            }
                          }}
                          disabled={uploading}
                        />
                        {uploading && (
                          <div className="space-y-2">
                            <Progress value={uploadProgress} />
                            <p className="text-xs text-muted-foreground">Téléchargement...</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Informations Importantes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p>• Les documents doivent être lisibles et en couleur</p>
            <p>• La validation peut prendre jusqu'à 48h ouvrées</p>
            <p>• En cas de rejet, vous recevrez un email avec les motifs</p>
            <p>• Vous pouvez re-télécharger un document rejeté à tout moment</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 