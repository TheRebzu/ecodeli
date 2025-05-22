'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { DeliveryApplication, Announcement } from '@/types/announcement';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Check, X, Star, Clock, Calendar, Euro, MessageSquare, User, ThumbsUp } from 'lucide-react';
import { formatDistance, format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DelivererProposalsListProps {
  announcement: Announcement;
  onAcceptProposal: (applicationId: string) => void;
  onRejectProposal: (applicationId: string) => void;
  onPreferProposal: (applicationId: string) => void;
  isProcessing?: boolean;
}

export function DelivererProposalsList({
  announcement,
  onAcceptProposal,
  onRejectProposal,
  onPreferProposal,
  isProcessing = false,
}: DelivererProposalsListProps) {
  const t = useTranslations('announcements');
  const applications = announcement.applications || [];
  const [expandedProposal, setExpandedProposal] = useState<string | null>(null);

  // Si aucune proposition n'est disponible
  if (applications.length === 0) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">{t('noProposalsYet')}</p>
        </CardContent>
      </Card>
    );
  }

  const toggleExpand = (id: string) => {
    setExpandedProposal(expandedProposal === id ? null : id);
  };

  // Calculer les profits pour le client
  const getClientSavings = (application: DeliveryApplication) => {
    if (!announcement.suggestedPrice || !application.proposedPrice) return 0;
    const savings = announcement.suggestedPrice - application.proposedPrice;
    return savings > 0 ? savings : 0;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">{t('delivererProposals')}</h3>
        <Badge variant="outline">{t('totalProposals', { count: applications.length })}</Badge>
      </div>

      {applications.map(application => (
        <Card
          key={application.id}
          className={application.isPreferred ? 'border-primary border-2' : ''}
        >
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={application.deliverer?.image || ''}
                    alt={application.deliverer?.name || t('unknownDeliverer')}
                  />
                  <AvatarFallback>
                    <User className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base">
                    {application.deliverer?.name || t('unknownDeliverer')}
                  </CardTitle>
                  <CardDescription>
                    {formatDistance(new Date(application.createdAt), new Date(), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </CardDescription>
                </div>
              </div>

              {application.isPreferred && (
                <Badge>
                  <ThumbsUp className="h-3 w-3 mr-1" />
                  {t('preferred')}
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              {/* Prix proposé */}
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">{t('proposedPrice')}</span>
                <div className="flex items-center">
                  <Euro className="h-4 w-4 mr-1 text-primary" />
                  <span className="font-medium">
                    {application.proposedPrice
                      ? `${application.proposedPrice.toFixed(2)} €`
                      : `${announcement.suggestedPrice?.toFixed(2) || '?'} €`}
                  </span>
                </div>
                {getClientSavings(application) > 0 && (
                  <span className="text-xs text-green-600">
                    {t('youSave', { amount: getClientSavings(application).toFixed(2) })}
                  </span>
                )}
              </div>

              {/* Heure de ramassage estimée */}
              {application.estimatedPickupTime && (
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">{t('estimatedPickup')}</span>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1 text-primary" />
                    <span className="font-medium">
                      {format(new Date(application.estimatedPickupTime), 'PPp', { locale: fr })}
                    </span>
                  </div>
                </div>
              )}

              {/* Heure de livraison estimée */}
              {application.estimatedDeliveryTime && (
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">{t('estimatedDelivery')}</span>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1 text-primary" />
                    <span className="font-medium">
                      {format(new Date(application.estimatedDeliveryTime), 'PPp', { locale: fr })}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Message du livreur */}
            {application.message && (
              <div className="mb-2">
                <div className="flex items-center mb-1">
                  <MessageSquare className="h-4 w-4 mr-1" />
                  <span className="text-sm font-medium">{t('delivererMessage')}</span>
                </div>
                <p className="text-sm text-muted-foreground border-l-2 pl-2 py-1 border-primary/30">
                  {application.message}
                </p>
              </div>
            )}

            {/* Notes supplémentaires (affichées uniquement si on développe la proposition) */}
            {expandedProposal === application.id && application.notes && (
              <div className="mt-2">
                <Separator className="my-2" />
                <div className="flex items-center mb-1">
                  <Star className="h-4 w-4 mr-1" />
                  <span className="text-sm font-medium">{t('additionalNotes')}</span>
                </div>
                <p className="text-sm text-muted-foreground">{application.notes}</p>
              </div>
            )}

            {/* Bouton pour développer/réduire les détails */}
            {application.notes && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleExpand(application.id)}
                className="mt-2 w-full text-xs"
              >
                {expandedProposal === application.id ? t('showLess') : t('showMore')}
              </Button>
            )}
          </CardContent>

          <CardFooter className="flex justify-between pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPreferProposal(application.id)}
              disabled={application.isPreferred || isProcessing}
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              {application.isPreferred ? t('preferred') : t('markPreferred')}
            </Button>

            <div className="flex space-x-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onRejectProposal(application.id)}
                disabled={isProcessing}
              >
                <X className="h-4 w-4 mr-2" />
                {t('reject')}
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={() => onAcceptProposal(application.id)}
                disabled={isProcessing}
              >
                <Check className="h-4 w-4 mr-2" />
                {t('accept')}
              </Button>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
