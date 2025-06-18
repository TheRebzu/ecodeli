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
import { FileText, Plus, Eye, Download, Clock, CheckCircle, AlertTriangle, Camera, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';

// Schéma de validation pour le rapport d'intervention
const interventionReportSchema = z.object({
  interventionId: z.string().min(1, 'Intervention requise'),
  title: z.string().min(5, 'Le titre doit contenir au moins 5 caractères'),
  description: z.string().min(20, 'La description doit contenir au moins 20 caractères'),
  workPerformed: z.string().min(10, 'Détails du travail effectué requis'),
  materialsUsed: z.string().optional(),
  timeSpent: z.number().min(1, 'Durée minimale de 1 minute'),
  issues: z.string().optional(),
  recommendations: z.string().optional(),
  clientSignature: z.boolean().default(false),
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED']).default('DRAFT'),
});

type InterventionReportFormData = z.infer<typeof interventionReportSchema>;

// Types pour les rapports d'intervention
interface InterventionReport {
  id: string;
  interventionId: string;
  interventionTitle: string;
  clientName: string;
  title: string;
  description: string;
  workPerformed: string;
  materialsUsed?: string;
  timeSpent: number;
  issues?: string;
  recommendations?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  clientSignature: boolean;
  photos: string[];
  createdAt: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

interface Intervention {
  id: string;
  title: string;
  clientName: string;
  scheduledDate: string;
  status: string;
}

/**
 * Composant de gestion des rapports d'intervention
 * Implémentation selon la Mission 1 - Documentation et suivi des interventions
 */
export default function InterventionReport() {
  const t = useTranslations('provider.interventions');
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [viewReport, setViewReport] = useState<InterventionReport | null>(null);

  // Queries tRPC
  const { data: reports, isLoading, refetch } = api.provider.getInterventionReports.useQuery();
  const { data: availableInterventions } = api.provider.getAvailableInterventions.useQuery();
  const { data: reportStats } = api.provider.getInterventionReportStats.useQuery();

  // Mutations tRPC
  const createReportMutation = api.provider.createInterventionReport.useMutation({
    onSuccess: () => {
      toast({
        title: 'Rapport créé',
        description: 'Le rapport d\'intervention a été créé avec succès.',
      });
      setIsDialogOpen(false);
      refetch();
      form.reset();
      setSelectedPhotos([]);
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const submitReportMutation = api.provider.submitInterventionReport.useMutation({
    onSuccess: () => {
      toast({
        title: 'Rapport soumis',
        description: 'Le rapport a été soumis pour validation.',
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

  const updateReportMutation = api.provider.updateInterventionReport.useMutation({
    onSuccess: () => {
      toast({
        title: 'Rapport mis à jour',
        description: 'Le rapport a été mis à jour avec succès.',
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
  const form = useForm<InterventionReportFormData>({
    resolver: zodResolver(interventionReportSchema),
    defaultValues: {
      interventionId: '',
      title: '',
      description: '',
      workPerformed: '',
      materialsUsed: '',
      timeSpent: 60,
      issues: '',
      recommendations: '',
      clientSignature: false,
      status: 'DRAFT',
    },
  });

  // Handlers
  const onSubmit = async (data: InterventionReportFormData) => {
    createReportMutation.mutate({
      ...data,
      photos: selectedPhotos,
    });
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.type)) {
        toast({
          title: 'Type de fichier non supporté',
          description: 'Seuls les fichiers JPEG, PNG et WebP sont acceptés.',
          variant: 'destructive',
        });
        return false;
      }

      if (file.size > maxSize) {
        toast({
          title: 'Fichier trop volumineux',
          description: 'La taille du fichier ne doit pas dépasser 5MB.',
          variant: 'destructive',
        });
        return false;
      }

      return true;
    });

    setSelectedPhotos(prev => [...prev, ...validFiles].slice(0, 10)); // Max 10 photos
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const getStatusBadge = (status: InterventionReport['status']) => {
    const statusConfig = {
      DRAFT: { label: 'Brouillon', variant: 'outline' as const, icon: FileText },
      SUBMITTED: { label: 'Soumis', variant: 'secondary' as const, icon: Clock },
      APPROVED: { label: 'Approuvé', variant: 'default' as const, icon: CheckCircle },
      REJECTED: { label: 'Rejeté', variant: 'destructive' as const, icon: AlertTriangle },
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

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
    }
    return `${mins}min`;
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
          <h1 className="text-2xl font-bold">Rapports d'Intervention</h1>
          <p className="text-muted-foreground">
            Documentez et gérez vos rapports d'intervention
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau rapport
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouveau Rapport d'Intervention</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="interventionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Intervention *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner une intervention" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableInterventions?.map((intervention) => (
                              <SelectItem key={intervention.id} value={intervention.id}>
                                {intervention.title} - {intervention.clientName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="timeSpent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Durée (minutes) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="120"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titre du rapport *</FormLabel>
                      <FormControl>
                        <Input placeholder="ex: Installation système de chauffage" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description générale *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Décrivez l'intervention réalisée..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="workPerformed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Travail effectué *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Détaillez les tâches accomplies, les étapes suivies..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="materialsUsed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Matériaux utilisés (optionnel)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Listez les matériaux, pièces et outils utilisés..."
                          className="min-h-[60px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="issues"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Problèmes rencontrés (optionnel)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Décrivez les difficultés ou problèmes rencontrés..."
                          className="min-h-[60px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="recommendations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recommandations (optionnel)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Recommandations pour l'entretien, amélioration..."
                          className="min-h-[60px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Upload de photos */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Photos de l'intervention (optionnel)
                  </label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                    <div className="text-center">
                      <Camera className="mx-auto h-8 w-8 text-muted-foreground" />
                      <div className="mt-2">
                        <label htmlFor="photos" className="cursor-pointer">
                          <span className="text-sm font-medium text-primary">
                            Ajouter des photos
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            JPEG, PNG, WebP (max 5MB chacune, max 10 photos)
                          </span>
                        </label>
                        <input
                          id="photos"
                          type="file"
                          multiple
                          className="hidden"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handlePhotoChange}
                        />
                      </div>
                    </div>
                  </div>

                  {selectedPhotos.length > 0 && (
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {selectedPhotos.map((photo, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(photo)}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-20 object-cover rounded border"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                            onClick={() => removePhoto(index)}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="clientSignature"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="mt-1"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Signature client obtenue</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Cochez si le client a signé le rapport d'intervention
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      form.reset();
                      setSelectedPhotos([]);
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={createReportMutation.isPending}
                  >
                    {createReportMutation.isPending ? 'Création...' : 'Créer le rapport'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistiques */}
      {reportStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{reportStats.total}</p>
                </div>
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Approuvés</p>
                  <p className="text-2xl font-bold text-green-600">{reportStats.approved}</p>
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
                  <p className="text-2xl font-bold text-yellow-600">{reportStats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Brouillons</p>
                  <p className="text-2xl font-bold text-blue-600">{reportStats.drafts}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Liste des rapports */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports?.map((report) => (
          <Card key={report.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{report.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {report.interventionTitle} - {report.clientName}
                  </CardDescription>
                </div>
                {getStatusBadge(report.status)}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Durée:</span>
                <span>{formatDuration(report.timeSpent)}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Créé le:</span>
                <span>{new Date(report.createdAt).toLocaleDateString('fr-FR')}</span>
              </div>
              
              {report.photos.length > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Photos:</span>
                  <span>{report.photos.length}</span>
                </div>
              )}

              {report.clientSignature && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Signé par le client
                </div>
              )}

              {report.status === 'REJECTED' && report.rejectionReason && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                  <strong>Rejeté:</strong> {report.rejectionReason}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setViewReport(report)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Voir
                </Button>
                
                {report.status === 'DRAFT' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => submitReportMutation.mutate({ id: report.id })}
                    disabled={submitReportMutation.isPending}
                  >
                    Soumettre
                  </Button>
                )}

                {report.status === 'APPROVED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // Générer et télécharger le PDF du rapport
                      window.open(`/api/reports/${report.id}/pdf`, '_blank');
                    }}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    PDF
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog de détail */}
      {viewReport && (
        <Dialog open={!!viewReport} onOpenChange={() => setViewReport(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {viewReport.title}
                {getStatusBadge(viewReport.status)}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Intervention</label>
                  <p>{viewReport.interventionTitle}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Client</label>
                  <p>{viewReport.clientName}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Durée</label>
                  <p>{formatDuration(viewReport.timeSpent)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date de création</label>
                  <p>{new Date(viewReport.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="text-sm leading-relaxed mt-1">{viewReport.description}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Travail effectué</label>
                <p className="text-sm leading-relaxed mt-1">{viewReport.workPerformed}</p>
              </div>

              {viewReport.materialsUsed && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Matériaux utilisés</label>
                  <p className="text-sm leading-relaxed mt-1">{viewReport.materialsUsed}</p>
                </div>
              )}

              {viewReport.issues && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Problèmes rencontrés</label>
                  <p className="text-sm leading-relaxed mt-1">{viewReport.issues}</p>
                </div>
              )}

              {viewReport.recommendations && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Recommandations</label>
                  <p className="text-sm leading-relaxed mt-1">{viewReport.recommendations}</p>
                </div>
              )}

              {viewReport.photos.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Photos</label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {viewReport.photos.map((photo, index) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-32 object-cover rounded border cursor-pointer"
                        onClick={() => window.open(photo, '_blank')}
                      />
                    ))}
                  </div>
                </div>
              )}

              {viewReport.clientSignature && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <strong>Rapport signé par le client</strong>
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* État vide */}
      {reports?.length === 0 && (
        <Card className="p-8 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucun rapport</h3>
          <p className="text-muted-foreground mb-4">
            Commencez par créer votre premier rapport d'intervention.
          </p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Créer mon premier rapport
          </Button>
        </Card>
      )}
    </div>
  );
}
