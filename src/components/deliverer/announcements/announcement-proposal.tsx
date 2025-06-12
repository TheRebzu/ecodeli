'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Euro, CheckCircle, Truck, Clock, Calendar, Loader2, Ban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils/common';
import { Announcement } from '@/types/announcements/announcement';

// Schéma de validation pour le formulaire de proposition
const proposalFormSchema = z.object({
  proposedPrice: z.number().positive('Le prix proposé doit être supérieur à 0'),
  estimatedDeliveryTime: z.string().datetime().optional(),
  message: z
    .string()
    .min(10, "Veuillez fournir un message d'au moins 10 caractères")
    .max(500, 'Le message ne peut pas dépasser 500 caractères'),
  hasRequiredEquipment: z.boolean().default(true),
  canPickupAtScheduledTime: z.boolean().default(true),
});

type ProposalFormValues = z.infer<typeof proposalFormSchema>;

interface AnnouncementProposalProps {
  announcementId: string;
  title: string;
  description: string;
  suggestedPrice: number;
  pickupDateTime?: string | Date;
  deliveryDateTime?: string | Date;
  isNegotiable: boolean;
  specialRequirements?: string[];
  onSubmit: (data: ProposalFormValues) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  error?: string;
}

/**
 * Composant de formulaire pour soumettre une proposition sur une annonce (pour les livreurs)
 */
export function AnnouncementProposal({
  announcementId,
  title,
  description,
  suggestedPrice,
  pickupDateTime,
  deliveryDateTime,
  isNegotiable,
  specialRequirements = [],
  onSubmit,
  onCancel,
  isSubmitting = false,
  error,
}: AnnouncementProposalProps) {
  const t = useTranslations('announcements');
  const [showPriceWarning, setShowPriceWarning] = useState(false);

  // Initialiser le formulaire avec React Hook Form et Zod
  const form = useForm<ProposalFormValues>({
    resolver: zodResolver(proposalFormSchema),
    defaultValues: {
      proposedPrice: suggestedPrice,
      estimatedDeliveryTime: deliveryDateTime
        ? new Date(deliveryDateTime).toISOString()
        : undefined,
      message: '',
      hasRequiredEquipment: true,
      canPickupAtScheduledTime: true,
    },
  });

  // Observer les changements de prix pour afficher des avertissements
  const proposedPrice = form.watch('proposedPrice');

  // Surveiller le prix pour afficher un avertissement si trop bas
  const handlePriceChange = (value: string) => {
    const price = parseFloat(value);
    if (!isNaN(price)) {
      form.setValue('proposedPrice', price);
      setShowPriceWarning(price < suggestedPrice * 0.8);
    }
  };

  // Gérer l'envoi du formulaire
  const handleSubmit = async (values: ProposalFormValues) => {
    await onSubmit(values);
  };

  // Formater une date pour l'affichage
  const formatDateTime = (dateTime?: string | Date) => {
    if (!dateTime) return t('notSpecified');
    return format(new Date(dateTime), 'PPpp', { locale: fr });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t('createProposal')}</CardTitle>
        <CardDescription>{t('createProposalDescription')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Résumé de l'annonce */}
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground mb-4">{description}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center">
              <Euro className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-muted-foreground mr-1">{t('suggestedPrice')}:</span>
              <span className="font-medium">
                {suggestedPrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </span>
              {isNegotiable && (
                <Badge variant="outline" className="ml-2">
                  {t('negotiable')}
                </Badge>
              )}
            </div>

            {pickupDateTime && (
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground mr-1">{t('pickupDateTime')}:</span>
                <span className="font-medium">{formatDateTime(pickupDateTime)}</span>
              </div>
            )}

            {deliveryDateTime && (
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground mr-1">{t('deliveryDateTime')}:</span>
                <span className="font-medium">{formatDateTime(deliveryDateTime)}</span>
              </div>
            )}
          </div>

          {specialRequirements.length > 0 && (
            <>
              <Separator className="my-3" />
              <div className="space-y-1">
                <h4 className="text-sm font-medium">{t('specialRequirements')}</h4>
                <ul className="text-xs list-disc list-inside text-muted-foreground">
                  {specialRequirements.map((req, index) => (
                    <li key={index}>{req}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Formulaire de proposition */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="proposedPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('proposedPrice')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Euro className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="0.00"
                        className="pl-9"
                        value={field.value}
                        onChange={e => handlePriceChange(e.target.value)}
                        step="0.5"
                        min="0"
                      />
                    </div>
                  </FormControl>
                  {showPriceWarning && (
                    <p className="text-yellow-600 text-xs flex items-center mt-1">
                      <Ban className="h-3.5 w-3.5 mr-1" />
                      {t('priceTooLow')}
                    </p>
                  )}
                  <FormDescription>
                    {isNegotiable
                      ? t('proposedPriceDescriptionNegotiable')
                      : t('proposedPriceDescription')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="estimatedDeliveryTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('estimatedDeliveryTime')}</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                      value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
                      onChange={e => {
                        if (e.target.value) {
                          field.onChange(new Date(e.target.value).toISOString());
                        } else {
                          field.onChange(undefined);
                        }
                      }}
                    />
                  </FormControl>
                  <FormDescription>{t('estimatedDeliveryTimeDescription')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('proposalMessage')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('proposalMessagePlaceholder')}
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{t('proposalMessageDescription')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormField
                control={form.control}
                name="hasRequiredEquipment"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>{t('hasRequiredEquipment')}</FormLabel>
                      <FormDescription>{t('hasRequiredEquipmentDescription')}</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="canPickupAtScheduledTime"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>{t('canPickupAtScheduledTime')}</FormLabel>
                      <FormDescription>{t('canPickupAtScheduledTimeDescription')}</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {error && (
              <div className="text-sm text-destructive flex items-center">
                <Ban className="h-4 w-4 mr-1" />
                <span>{error}</span>
              </div>
            )}
          </form>
        </Form>
      </CardContent>

      <CardFooter className="flex justify-between">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            {t('cancel')}
          </Button>
        )}

        <Button onClick={form.handleSubmit(handleSubmit)} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('submitting')}
            </>
          ) : (
            <>
              <Truck className="mr-2 h-4 w-4" />
              {t('submitProposal')}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

/**
 * Composant pour que les clients puissent voir et gérer les propositions reçues
 */
interface ClientProposalViewProps {
  announcements: Announcement[];
  onAcceptProposal: (announcementId: string, proposalId: string) => Promise<void>;
  onRejectProposal: (announcementId: string, proposalId: string) => Promise<void>;
  onViewDetails: (proposalId: string) => void;
  isLoading?: boolean;
}

interface DelivererProposal {
  id: string;
  delivererId: string;
  delivererName: string;
  delivererImage?: string;
  proposedPrice: number;
  estimatedDeliveryTime?: string;
  message: string;
  hasRequiredEquipment: boolean;
  canPickupAtScheduledTime: boolean;
  rating: number;
  completedDeliveries: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  submittedAt: string;
  compatibilityScore?: number;
  distance?: number;
}

export function ClientProposalManager({
  announcements,
  onAcceptProposal,
  onRejectProposal,
  onViewDetails,
  isLoading = false,
}: ClientProposalViewProps) {
  const t = useTranslations('announcements');
  const [expandedAnnouncements, setExpandedAnnouncements] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'price' | 'rating' | 'compatibility' | 'date'>(
    'compatibility'
  );

  const toggleAnnouncementExpansion = (announcementId: string) => {
    const newExpanded = new Set(expandedAnnouncements);
    if (newExpanded.has(announcementId)) {
      newExpanded.delete(announcementId);
    } else {
      newExpanded.add(announcementId);
    }
    setExpandedAnnouncements(newExpanded);
  };

  const sortProposals = (proposals: DelivererProposal[]) => {
    return [...proposals].sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return a.proposedPrice - b.proposedPrice;
        case 'rating':
          return b.rating - a.rating;
        case 'compatibility':
          return (b.compatibilityScore || 0) - (a.compatibilityScore || 0);
        case 'date':
          return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
        default:
          return 0;
      }
    });
  };

  const formatDateTime = (dateTime: string) => {
    return format(new Date(dateTime), 'PPp', { locale: fr });
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">{t('loadingProposals')}</span>
        </CardContent>
      </Card>
    );
  }

  const announcementsWithProposals = announcements.filter(
    announcement => announcement.applications && announcement.applications.length > 0
  );

  if (announcementsWithProposals.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="text-center py-8">
          <div className="text-muted-foreground">
            <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">{t('noProposalsYet')}</p>
            <p className="text-sm">{t('noProposalsDescription')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec options de tri */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('receivedProposals')}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t('sortBy')}:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="compatibility">{t('compatibility')}</option>
                <option value="price">{t('price')}</option>
                <option value="rating">{t('rating')}</option>
                <option value="date">{t('submissionDate')}</option>
              </select>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Liste des annonces avec propositions */}
      {announcementsWithProposals.map(announcement => {
        const isExpanded = expandedAnnouncements.has(announcement.id);
        const proposals = sortProposals(announcement.applications || []);
        const pendingProposals = proposals.filter(p => p.status === 'PENDING');

        return (
          <Card key={announcement.id} className="w-full">
            <CardHeader
              className="cursor-pointer"
              onClick={() => toggleAnnouncementExpansion(announcement.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{announcement.title}</CardTitle>
                  <CardDescription className="flex items-center gap-4 mt-1">
                    <span>
                      {t('suggestedPrice')}:{' '}
                      {announcement.suggestedPrice?.toLocaleString('fr-FR', {
                        style: 'currency',
                        currency: 'EUR',
                      })}
                    </span>
                    <Badge variant={pendingProposals.length > 0 ? 'default' : 'secondary'}>
                      {pendingProposals.length} {t('pendingProposals')}
                    </Badge>
                    <Badge variant="outline">
                      {proposals.length} {t('totalProposals')}
                    </Badge>
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm">
                  {isExpanded ? '▼' : '▶'}
                </Button>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="space-y-4">
                {proposals.map(proposal => (
                  <div
                    key={proposal.id}
                    className={cn(
                      'border rounded-lg p-4 space-y-3',
                      proposal.status === 'ACCEPTED' && 'border-green-200 bg-green-50',
                      proposal.status === 'REJECTED' && 'border-red-200 bg-red-50',
                      proposal.status === 'PENDING' && 'border-blue-200 bg-blue-50'
                    )}
                  >
                    {/* En-tête de la proposition */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          {proposal.delivererImage ? (
                            <img
                              src={proposal.delivererImage}
                              alt={proposal.delivererName}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-medium">
                              {proposal.delivererName.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{proposal.delivererName}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>⭐ {proposal.rating.toFixed(1)}</span>
                            <span>•</span>
                            <span>
                              {proposal.completedDeliveries} {t('deliveries')}
                            </span>
                            {proposal.distance && (
                              <>
                                <span>•</span>
                                <span>{proposal.distance.toFixed(1)} km</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-green-600">
                          {proposal.proposedPrice.toLocaleString('fr-FR', {
                            style: 'currency',
                            currency: 'EUR',
                          })}
                        </p>
                        {proposal.compatibilityScore && (
                          <p className="text-xs text-muted-foreground">
                            {t('compatibility')}: {proposal.compatibilityScore}%
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Message de la proposition */}
                    <div className="bg-white rounded p-3 border">
                      <p className="text-sm">{proposal.message}</p>
                    </div>

                    {/* Détails de la proposition */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {proposal.estimatedDeliveryTime && (
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>
                            {t('estimatedDelivery')}:{' '}
                            {formatDateTime(proposal.estimatedDeliveryTime)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>
                          {t('hasEquipment')}: {proposal.hasRequiredEquipment ? t('yes') : t('no')}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>
                          {t('canPickupOnTime')}:{' '}
                          {proposal.canPickupAtScheduledTime ? t('yes') : t('no')}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>
                          {t('submittedAt')}: {formatDateTime(proposal.submittedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Actions pour les propositions en attente */}
                    {proposal.status === 'PENDING' && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => onAcceptProposal(announcement.id, proposal.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          {t('acceptProposal')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onRejectProposal(announcement.id, proposal.id)}
                        >
                          <Ban className="h-4 w-4 mr-1" />
                          {t('rejectProposal')}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onViewDetails(proposal.id)}
                        >
                          {t('viewProfile')}
                        </Button>
                      </div>
                    )}

                    {/* Statut de la proposition */}
                    {proposal.status !== 'PENDING' && (
                      <div className="pt-2">
                        <Badge variant={proposal.status === 'ACCEPTED' ? 'default' : 'destructive'}>
                          {proposal.status === 'ACCEPTED' ? t('accepted') : t('rejected')}
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

export default AnnouncementProposal;
