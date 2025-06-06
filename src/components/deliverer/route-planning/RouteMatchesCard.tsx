'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  CheckCircleIcon,
  XCircleIcon,
  MapPinIcon,
  ClockIcon,
  EuroIcon,
  TruckIcon,
  StarIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface RouteMatch {
  id: string;
  routeId: string;
  announcementId: string;
  announcement: {
    id: string;
    title: string;
    description?: string;
    pickupAddress: string;
    deliveryAddress: string;
    pickupCity: string;
    deliveryCity: string;
    pickupDate: Date;
    suggestedPrice: number;
    weight?: number;
    volume?: number;
    client: {
      name: string;
      image?: string;
    };
  };
  matchScore: number;
  estimatedProfit: number;
  pickupDistance: number;
  deliveryDistance: number;
  totalDetour: number;
  fuelCost: number;
  platformFee: number;
  isAccepted: boolean;
  isRejected: boolean;
  expiresAt: string;
}

interface RouteMatchesCardProps {
  matches: RouteMatch[];
  routeName: string;
  onAcceptMatch: (matchId: string) => Promise<void>;
  onRejectMatch: (matchId: string, reason?: string) => Promise<void>;
  isLoading?: boolean;
}

export function RouteMatchesCard({ 
  matches, 
  routeName, 
  onAcceptMatch, 
  onRejectMatch, 
  isLoading = false 
}: RouteMatchesCardProps) {
  const [loadingMatchId, setLoadingMatchId] = useState<string | null>(null);

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <TruckIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">Aucune correspondance trouvée</h3>
            <p className="text-sm">
              Nous cherchons automatiquement des livraisons compatibles avec votre trajet "{routeName}".
              Vous serez notifié dès qu'une nouvelle correspondance sera trouvée.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleAccept = async (matchId: string) => {
    try {
      setLoadingMatchId(matchId);
      await onAcceptMatch(matchId);
    } catch (error) {
      console.error('Erreur lors de l\'acceptation:', error);
    } finally {
      setLoadingMatchId(null);
    }
  };

  const handleReject = async (matchId: string) => {
    try {
      setLoadingMatchId(matchId);
      await onRejectMatch(matchId, 'Non compatible avec mes préférences');
    } catch (error) {
      console.error('Erreur lors du rejet:', error);
    } finally {
      setLoadingMatchId(null);
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getProfitColor = (profit: number) => {
    if (profit >= 15) return 'text-green-600';
    if (profit >= 5) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">
          Correspondances pour "{routeName}"
        </h3>
        <Badge variant="secondary" className="ml-2">
          {matches.length} trouvée{matches.length > 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="grid gap-4">
        {matches.map((match) => {
          const isExpired = new Date(match.expiresAt) < new Date();
          const isActionTaken = match.isAccepted || match.isRejected;
          
          return (
            <Card 
              key={match.id} 
              className={cn(
                "transition-all duration-200",
                isExpired && "opacity-60",
                match.isAccepted && "border-green-200 bg-green-50",
                match.isRejected && "border-red-200 bg-red-50"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={match.announcement.client.image} />
                      <AvatarFallback>
                        {match.announcement.client.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">{match.announcement.title}</CardTitle>
                      <p className="text-sm text-gray-600">
                        Par {match.announcement.client.name}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge 
                      className={cn("text-xs", getMatchScoreColor(match.matchScore))}
                      variant="secondary"
                    >
                      {match.matchScore}% compatible
                    </Badge>
                    {match.isAccepted && (
                      <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    )}
                    {match.isRejected && (
                      <XCircleIcon className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Itinéraire */}
                <div className="flex items-center space-x-2 text-sm">
                  <MapPinIcon className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{match.announcement.pickupCity}</span>
                  <span className="text-gray-400">→</span>
                  <span className="font-medium">{match.announcement.deliveryCity}</span>
                  <span className="text-gray-500">
                    (+{match.totalDetour.toFixed(1)}km détour)
                  </span>
                </div>

                {/* Timing */}
                <div className="flex items-center space-x-2 text-sm">
                  <ClockIcon className="w-4 h-4 text-gray-400" />
                  <span>
                    {format(new Date(match.announcement.pickupDate), 'PPp', { locale: fr })}
                  </span>
                  {isExpired && (
                    <Badge variant="destructive" className="text-xs">
                      Expiré
                    </Badge>
                  )}
                </div>

                {/* Détails colis */}
                {(match.announcement.weight || match.announcement.volume) && (
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    {match.announcement.weight && (
                      <span>{match.announcement.weight}kg</span>
                    )}
                    {match.announcement.volume && (
                      <span>{match.announcement.volume}m³</span>
                    )}
                  </div>
                )}

                <Separator />

                {/* Analyse financière */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Prix annoncé:</span>
                      <span className="font-medium">
                        {match.announcement.suggestedPrice.toFixed(2)}€
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Commission:</span>
                      <span className="text-red-600">
                        -{match.platformFee.toFixed(2)}€
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Carburant:</span>
                      <span className="text-red-600">
                        -{match.fuelCost.toFixed(2)}€
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col justify-center items-end">
                    <div className="text-right">
                      <div className="text-xs text-gray-500 mb-1">Profit estimé</div>
                      <div className={cn(
                        "text-xl font-bold flex items-center",
                        getProfitColor(match.estimatedProfit)
                      )}>
                        <EuroIcon className="w-4 h-4 mr-1" />
                        {match.estimatedProfit.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {match.announcement.description && (
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    {match.announcement.description}
                  </div>
                )}
              </CardContent>

              {/* Actions */}
              {!isActionTaken && !isExpired && (
                <CardFooter className="pt-0">
                  <div className="flex space-x-2 w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(match.id)}
                      disabled={loadingMatchId === match.id}
                      className="flex-1"
                    >
                      <XCircleIcon className="w-4 h-4 mr-2" />
                      Refuser
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAccept(match.id)}
                      disabled={loadingMatchId === match.id || match.estimatedProfit <= 0}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircleIcon className="w-4 h-4 mr-2" />
                      {loadingMatchId === match.id ? 'Candidature...' : 'Accepter'}
                    </Button>
                  </div>
                </CardFooter>
              )}

              {/* Statut des actions */}
              {isActionTaken && (
                <CardFooter className="pt-0">
                  {match.isAccepted && (
                    <div className="w-full p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm text-center">
                      ✅ Candidature envoyée automatiquement
                    </div>
                  )}
                  {match.isRejected && (
                    <div className="w-full p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm text-center">
                      ❌ Correspondance refusée
                    </div>
                  )}
                </CardFooter>
              )}
            </Card>
          );
        })}
      </div>

      {/* Résumé */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="space-y-1">
              <div className="font-medium text-blue-900">Résumé des correspondances</div>
              <div className="text-blue-700">
                {matches.filter(m => m.isAccepted).length} acceptées • {' '}
                {matches.filter(m => m.isRejected).length} refusées • {' '}
                {matches.filter(m => !m.isAccepted && !m.isRejected && new Date(m.expiresAt) > new Date()).length} en attente
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-blue-600 mb-1">Profit total potentiel</div>
              <div className="text-lg font-bold text-blue-900">
                {matches
                  .filter(m => m.isAccepted)
                  .reduce((sum, m) => sum + m.estimatedProfit, 0)
                  .toFixed(2)}€
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}