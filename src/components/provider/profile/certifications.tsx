'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from "@/components/ui/use-toast";
import { Upload, Plus, Eye, Download, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';

// Schéma de validation pour l'ajout de certification
const certificationSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  type: z.enum(['PROFESSIONAL', 'ACADEMIC', 'TECHNICAL', 'REGULATORY']),
  issuingOrganization: z.string().min(2, 'Organisation émettrice requise'),
  issueDate: z.string().min(1, 'Date d\'émission requise'),
  expiryDate: z.string().optional(),
  description: z.string().optional(),
  credentialId: z.string().optional(),
  verificationUrl: z.string().url('URL de vérification invalide').optional().or(z.literal('')),
});

type CertificationFormData = z.infer<typeof certificationSchema>;

// Types pour les certifications
interface Certification {
  id: string;
  name: string;
  type: 'PROFESSIONAL' | 'ACADEMIC' | 'TECHNICAL' | 'REGULATORY';
  issuingOrganization: string;
  issueDate: string;
  expiryDate?: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
  description?: string;
  credentialId?: string;
  verificationUrl?: string;
  documentUrl?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
}

/**
 * Composant de gestion des certifications prestataires
 * Implémentation selon la Mission 1 - Gestion des qualifications et certifications
 */
export default function Certifications() {
  const t = useTranslations('provider.certifications');
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewCertification, setViewCertification] = useState<Certification | null>(null);

  // Queries tRPC
  const { data: certifications, isLoading, refetch } = api.provider.getCertifications.useQuery();
  const { data: certificationStats } = api.provider.getCertificationStats.useQuery();

  // Mutations tRPC
  const createCertificationMutation = api.provider.createCertification.useMutation({
    onSuccess: () => {
      toast({
        title: 'Certification ajoutée',
        description: 'Votre certification a été soumise pour vérification.',
      });
      setIsDialogOpen(false);
      refetch();
      form.reset();
      setSelectedFile(null);
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteCertificationMutation = api.provider.deleteCertification.useMutation({
    onSuccess: () => {
      toast({
        title: 'Certification supprimée',
        description: 'La certification a été supprimée avec succès.',
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resubmitCertificationMutation = api.provider.resubmitCertification.useMutation({
    onSuccess: () => {
      toast({
        title: 'Certification resoumise',
        description: 'Votre certification a été resoumise pour vérification.',
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Form setup
  const form = useForm<CertificationFormData>({
    resolver: zodResolver(certificationSchema),
    defaultValues: {
      name: '',
      type: 'PROFESSIONAL',
      issuingOrganization: '',
      issueDate: '',
      expiryDate: '',
      description: '',
      credentialId: '',
      verificationUrl: '',
    },
  });

  // Handlers
  const onSubmit = async (data: CertificationFormData) => {
    if (!selectedFile) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un document de certification.',
        variant: 'destructive',
      });
      return;
    }

    // Upload du fichier et création de la certification
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('data', JSON.stringify(data));

    createCertificationMutation.mutate({
      ...data,
      documentFile: selectedFile,
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Vérifier le type et la taille du fichier
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.type)) {
        toast({
          title: 'Type de fichier non supporté',
          description: 'Seuls les fichiers PDF, JPEG et PNG sont acceptés.',
          variant: 'destructive',
        });
        return;
      }

      if (file.size > maxSize) {
        toast({
          title: 'Fichier trop volumineux',
          description: 'La taille du fichier ne doit pas dépasser 5MB.',
          variant: 'destructive',
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const getStatusBadge = (status: Certification['status']) => {
    const statusConfig = {
      PENDING: { label: 'En attente', variant: 'secondary' as const, icon: Clock },
      VERIFIED: { label: 'Vérifiée', variant: 'default' as const, icon: CheckCircle },
      REJECTED: { label: 'Rejetée', variant: 'destructive' as const, icon: AlertTriangle },
      EXPIRED: { label: 'Expirée', variant: 'outline' as const, icon: AlertTriangle },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getTypeLabel = (type: Certification['type']) => {
    const typeLabels = {
      PROFESSIONAL: 'Professionnelle',
      ACADEMIC: 'Académique',
      TECHNICAL: 'Technique',
      REGULATORY: 'Réglementaire',
    };
    return typeLabels[type];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Mes Certifications</h1>
          <p className="text-muted-foreground">
            Gérez vos certifications professionnelles et qualifications
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une certification
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nouvelle Certification</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom de la certification</FormLabel>
                        <FormControl>
                          <Input placeholder="ex: Certification ISO 9001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner le type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PROFESSIONAL">Professionnelle</SelectItem>
                            <SelectItem value="ACADEMIC">Académique</SelectItem>
                            <SelectItem value="TECHNICAL">Technique</SelectItem>
                            <SelectItem value="REGULATORY">Réglementaire</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="issuingOrganization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organisation émettrice</FormLabel>
                      <FormControl>
                        <Input placeholder="ex: AFNOR, Université de Paris..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="issueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date d'émission</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expiryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date d'expiration (optionnel)</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="credentialId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID de certification (optionnel)</FormLabel>
                        <FormControl>
                          <Input placeholder="ex: CERT-2024-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="verificationUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL de vérification (optionnel)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (optionnel)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Décrivez les compétences et connaissances validées par cette certification..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Upload de document */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Document de certification *
                  </label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                    <div className="text-center">
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                      <div className="mt-4">
                        <label htmlFor="certification-file" className="cursor-pointer">
                          <span className="mt-2 block text-sm font-medium text-primary">
                            Choisir un fichier
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            PDF, JPEG, PNG (max 5MB)
                          </span>
                        </label>
                        <input
                          id="certification-file"
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleFileChange}
                        />
                      </div>
                      {selectedFile && (
                        <div className="mt-2 text-sm text-green-600">
                          Fichier sélectionné: {selectedFile.name}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      form.reset();
                      setSelectedFile(null);
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={createCertificationMutation.isPending}
                  >
                    {createCertificationMutation.isPending ? 'Ajout...' : 'Ajouter'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistiques */}
      {certificationStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{certificationStats.total}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Vérifiées</p>
                  <p className="text-2xl font-bold text-green-600">{certificationStats.verified}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">En attente</p>
                  <p className="text-2xl font-bold text-yellow-600">{certificationStats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Expirées</p>
                  <p className="text-2xl font-bold text-red-600">{certificationStats.expired}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Liste des certifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {certifications?.map((certification) => (
          <Card key={certification.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{certification.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {certification.issuingOrganization}
                  </CardDescription>
                </div>
                {getStatusBadge(certification.status)}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Type:</span>
                <span>{getTypeLabel(certification.type)}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Émise le:</span>
                <span>{new Date(certification.issueDate).toLocaleDateString('fr-FR')}</span>
              </div>
              
              {certification.expiryDate && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Expire le:</span>
                  <span>{new Date(certification.expiryDate).toLocaleDateString('fr-FR')}</span>
                </div>
              )}

              {certification.credentialId && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">ID:</span>
                  <span className="font-mono text-xs">{certification.credentialId}</span>
                </div>
              )}

              {certification.status === 'REJECTED' && certification.rejectionReason && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">
                    <strong>Motif de rejet:</strong> {certification.rejectionReason}
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setViewCertification(certification)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Voir
                </Button>
                
                {certification.documentUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(certification.documentUrl, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Document
                  </Button>
                )}

                {certification.status === 'REJECTED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resubmitCertificationMutation.mutate({ id: certification.id })}
                    disabled={resubmitCertificationMutation.isPending}
                  >
                    Resoumettre
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog de détail */}
      {viewCertification && (
        <Dialog open={!!viewCertification} onOpenChange={() => setViewCertification(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {viewCertification.name}
                {getStatusBadge(viewCertification.status)}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type</label>
                  <p>{getTypeLabel(viewCertification.type)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Organisation</label>
                  <p>{viewCertification.issuingOrganization}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date d'émission</label>
                  <p>{new Date(viewCertification.issueDate).toLocaleDateString('fr-FR')}</p>
                </div>
                {viewCertification.expiryDate && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Date d'expiration</label>
                    <p>{new Date(viewCertification.expiryDate).toLocaleDateString('fr-FR')}</p>
                  </div>
                )}
              </div>

              {viewCertification.credentialId && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ID de certification</label>
                  <p className="font-mono">{viewCertification.credentialId}</p>
                </div>
              )}

              {viewCertification.verificationUrl && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">URL de vérification</label>
                  <a
                    href={viewCertification.verificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {viewCertification.verificationUrl}
                  </a>
                </div>
              )}

              {viewCertification.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="text-sm leading-relaxed">{viewCertification.description}</p>
                </div>
              )}

              {viewCertification.verifiedAt && viewCertification.verifiedBy && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">
                    <strong>Vérifiée le:</strong> {new Date(viewCertification.verifiedAt).toLocaleDateString('fr-FR')} par {viewCertification.verifiedBy}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* État vide */}
      {certifications?.length === 0 && (
        <Card className="p-8 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucune certification</h3>
          <p className="text-muted-foreground mb-4">
            Commencez par ajouter vos certifications professionnelles pour valoriser votre profil.
          </p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter ma première certification
          </Button>
        </Card>
      )}
    </div>
  );
}
