'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  MapPin,
  Clock,
  Package,
  Route,
  Star,
  Zap,
  TrendingUp,
  AlertCircle,
  Bell,
  BellRing,
  Eye,
  MessageCircle,
  Phone,
  Calendar,
  Euro,
  Truck,
  Users,
  Heart,
  CheckCircle,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils/common';
import { formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';

// Types pour le matching
interface MatchingCriteria {
  routeId: string;
  announcementId: string;
  compatibilityScore: number;
  reasons: string[];
  distance: number;
  detourPercentage: number;
  priceEstimate: number;
  estimatedDuration: string;
  matchingPoints: {
    pickup: { latitude: number; longitude: number; address: string };
    delivery: { latitude: number; longitude: number; address: string };
  };
}

interface AnnouncementMatch {
  id: string;
  announcement: {
    id: string;
    title: string;
    description: string;
    type: string;
    pickupAddress: string;
    deliveryAddress: string;
    pickupDate?: Date;
    deliveryDate?: Date;
    suggestedPrice: number;
    weight?: number;
    isFragile: boolean;
    needsCooling: boolean;
    client: {
      id: string;
      name: string;
      image?: string;
      rating: number;
      completedDeliveries: number;
    };
  };
  route: {
    id: string;
    title: string;
    departureAddress: string;
    arrivalAddress: string;
    departureDate?: Date;
    arrivalDate?: Date;
    deliverer: {
      id: string;
      name: string;
      image?: string;
      rating: number;
      completedDeliveries: number;
    };
  };
  matching: MatchingCriteria;
  createdAt: Date;
  notified: boolean;
}

interface AnnouncementMatchingDisplayProps {
  matches: AnnouncementMatch[];
  userRole: 'CLIENT' | 'DELIVERER';
  isLoading?: boolean;
  onApply?: (matchId: string) => void;
  onReject?: (matchId: string) => void;
  onViewDetails?: (matchId: string) => void;
  onContact?: (userId: string) => void;
  onMarkAsRead?: (matchId: string) => void;
  enableNotifications?: boolean;
  onNotificationToggle?: (enabled: boolean) => void;
  className?: string;
}

const COMPATIBILITY_THRESHOLDS = {
  excellent: 90,
  good: 75,
  fair: 60,
  poor: 40,
};

const COMPATIBILITY_COLORS = {
  excellent: 'bg-green-500',
  good: 'bg-blue-500',
  fair: 'bg-yellow-500',
  poor: 'bg-red-500',
};

export const AnnouncementMatchingDisplay: React.FC<AnnouncementMatchingDisplayProps> = ({
  matches,
  userRole,
  isLoading = false,
  onApply,
  onReject,
  onViewDetails,
  onContact,
  onMarkAsRead,
  enableNotifications = true,
  onNotificationToggle,
  className,
}) => {
  const t = useTranslations('matching');
  const [selectedMatch, setSelectedMatch] = useState<AnnouncementMatch | null>(null);
  const [newMatches, setNewMatches] = useState<string[]>([]);

  // Détection des nouveaux matches
  useEffect(() => {
    const unreadMatches = matches
      .filter(match => !match.notified)
      .map(match => match.id);
    setNewMatches(unreadMatches);
  }, [matches]);

  const getCompatibilityLevel = (score: number) => {
    if (score >= COMPATIBILITY_THRESHOLDS.excellent) return 'excellent';
    if (score >= COMPATIBILITY_THRESHOLDS.good) return 'good';
    if (score >= COMPATIBILITY_THRESHOLDS.fair) return 'fair';
    return 'poor';
  };

  const getCompatibilityColor = (score: number) => {
    const level = getCompatibilityLevel(score);
    return COMPATIBILITY_COLORS[level];
  };

  const getCompatibilityLabel = (score: number) => {
    const level = getCompatibilityLevel(score);
    return t(`compatibility.${level}`);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const formatRelativeDate = (date: Date) => {
    return formatDistance(date, new Date(), {
      addSuffix: true,
      locale: fr,
    });
  };

  const handleMatchClick = (match: AnnouncementMatch) => {
    setSelectedMatch(match);
    if (!match.notified && onMarkAsRead) {
      onMarkAsRead(match.id);
    }
  };

  const sortedMatches = matches.sort((a, b) => {
    // Nouveaux matches en premier
    if (!a.notified && b.notified) return -1;
    if (a.notified && !b.notified) return 1;
    // Puis par score de compatibilité
    return b.matching.compatibilityScore - a.matching.compatibilityScore;
  });

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="h-20 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-12">
          <Route className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('noMatches.title')}</h3>
          <p className="text-muted-foreground mb-6">
            {userRole === 'DELIVERER' 
              ? t('noMatches.delivererDescription')
              : t('noMatches.clientDescription')
            }
          </p>
          {enableNotifications && (
            <Alert className="text-left max-w-md mx-auto">
              <Bell className="h-4 w-4" />
              <AlertTitle>{t('notifications.title')}</AlertTitle>
              <AlertDescription>
                {t('notifications.description')}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header avec stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('title')}</h2>
          <p className="text-muted-foreground">
            {t('matchesFound', { count: matches.length })}
          </p>
        </div>
        
        {onNotificationToggle && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNotificationToggle(!enableNotifications)}
                >
                  {enableNotifications ? (
                    <BellRing className="h-4 w-4 mr-2" />
                  ) : (
                    <Bell className="h-4 w-4 mr-2" />
                  )}
                  {enableNotifications ? t('notificationsOn') : t('notificationsOff')}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {enableNotifications
                  ? t('disableNotifications')
                  : t('enableNotifications')
                }
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Nouveaux matches */}
      {newMatches.length > 0 && (
        <Alert className="border-blue-200 bg-blue-50">
          <Zap className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">
            {t('newMatches.title')}
          </AlertTitle>
          <AlertDescription className="text-blue-700">
            {t('newMatches.description', { count: newMatches.length })}
          </AlertDescription>
        </Alert>
      )}

      {/* Liste des matches */}
      <div className="space-y-4">
        {sortedMatches.map((match) => {
          const isNew = newMatches.includes(match.id);
          const compatibility = match.matching.compatibilityScore;
          const compatibilityLevel = getCompatibilityLevel(compatibility);
          
          return (
            <Card
              key={match.id}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md',
                isNew && 'ring-2 ring-blue-500 border-blue-200',
                compatibility >= COMPATIBILITY_THRESHOLDS.excellent && 'border-green-200',
                compatibility >= COMPATIBILITY_THRESHOLDS.good && compatibility < COMPATIBILITY_THRESHOLDS.excellent && 'border-blue-200'
              )}
              onClick={() => handleMatchClick(match)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <CardTitle className="text-lg">
                        {userRole === 'DELIVERER' 
                          ? match.announcement.title
                          : match.route.title
                        }
                      </CardTitle>
                      {isNew && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          {t('new')}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="flex items-center space-x-4">
                      <span className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatRelativeDate(match.createdAt)}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3" />
                        <span>{match.matching.distance.toFixed(1)} km</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Euro className="h-3 w-3" />
                        <span>{formatPrice(match.matching.priceEstimate)}</span>
                      </span>
                    </CardDescription>
                  </div>
                  
                  <div className="text-right space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">
                        {compatibility}%
                      </span>
                      <div className="w-16">
                        <Progress 
                          value={compatibility} 
                          className="h-2"
                          style={{
                            '--progress-background': getCompatibilityColor(compatibility)
                          } as React.CSSProperties}
                        />
                      </div>
                    </div>
                    <Badge 
                      variant="outline"
                      className={cn(
                        'text-white border-0',
                        getCompatibilityColor(compatibility)
                      )}
                    >
                      {getCompatibilityLabel(compatibility)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-4">
                  {/* Informations sur la personne */}
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage 
                        src={userRole === 'DELIVERER' 
                          ? match.announcement.client.image
                          : match.route.deliverer.image
                        } 
                      />
                      <AvatarFallback>
                        {userRole === 'DELIVERER'
                          ? match.announcement.client.name.substring(0, 2).toUpperCase()
                          : match.route.deliverer.name.substring(0, 2).toUpperCase()
                        }
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {userRole === 'DELIVERER'
                            ? match.announcement.client.name
                            : match.route.deliverer.name
                          }
                        </span>
                        <div className="flex items-center space-x-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm">
                            {userRole === 'DELIVERER'
                              ? match.announcement.client.rating.toFixed(1)
                              : match.route.deliverer.rating.toFixed(1)
                            }
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {userRole === 'DELIVERER'
                          ? t('completedOrders', { count: match.announcement.client.completedDeliveries })
                          : t('completedDeliveries', { count: match.route.deliverer.completedDeliveries })
                        }
                      </div>
                    </div>
                  </div>

                  {/* Trajet */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 text-green-500 mt-0.5" />
                        <div>
                          <div className="font-medium text-green-700">{t('pickup')}</div>
                          <div className="text-muted-foreground">
                            {userRole === 'DELIVERER'
                              ? match.announcement.pickupAddress
                              : match.route.departureAddress
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 text-red-500 mt-0.5" />
                        <div>
                          <div className="font-medium text-red-700">{t('delivery')}</div>
                          <div className="text-muted-foreground">
                            {userRole === 'DELIVERER'
                              ? match.announcement.deliveryAddress
                              : match.route.arrivalAddress
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Raisons du matching */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium">{t('matchingReasons')}</div>
                    <div className="flex flex-wrap gap-1">
                      {match.matching.reasons.map((reason, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {t(`reasons.${reason}`)}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      {match.matching.detourPercentage > 0 && (
                        <span className="flex items-center space-x-1">
                          <TrendingUp className="h-3 w-3" />
                          <span>+{match.matching.detourPercentage}% détour</span>
                        </span>
                      )}
                      <span className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{match.matching.estimatedDuration}</span>
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {onContact && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onContact(
                              userRole === 'DELIVERER'
                                ? match.announcement.client.id
                                : match.route.deliverer.id
                            );
                          }}
                        >
                          <MessageCircle className="h-4 w-4 mr-1" />
                          {t('contact')}
                        </Button>
                      )}
                      
                      {onViewDetails && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDetails(match.id);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {t('details')}
                        </Button>
                      )}
                      
                      {onApply && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onApply(match.id);
                          }}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          {userRole === 'DELIVERER' ? t('apply') : t('accept')}
                        </Button>
                      )}
                      
                      {onReject && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onReject(match.id);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog de détails */}
      {selectedMatch && (
        <Dialog open={!!selectedMatch} onOpenChange={() => setSelectedMatch(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('matchDetails')}</DialogTitle>
              <DialogDescription>
                {t('matchDetailsDescription')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Score de compatibilité */}
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">
                  {selectedMatch.matching.compatibilityScore}%
                </div>
                <Badge 
                  variant="outline"
                  className={cn(
                    'text-white border-0 text-lg px-4 py-1',
                    getCompatibilityColor(selectedMatch.matching.compatibilityScore)
                  )}
                >
                  {getCompatibilityLabel(selectedMatch.matching.compatibilityScore)}
                </Badge>
              </div>

              {/* Détails du trajet */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {userRole === 'DELIVERER' ? t('announcement') : t('route')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="font-medium">
                          {userRole === 'DELIVERER'
                            ? selectedMatch.announcement.title
                            : selectedMatch.route.title
                          }
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {userRole === 'DELIVERER'
                            ? selectedMatch.announcement.description
                            : `${selectedMatch.route.departureAddress} → ${selectedMatch.route.arrivalAddress}`
                          }
                        </div>
                      </div>
                      
                      {userRole === 'DELIVERER' && selectedMatch.announcement.weight && (
                        <div className="flex items-center space-x-2">
                          <Package className="h-4 w-4" />
                          <span className="text-sm">{selectedMatch.announcement.weight} kg</span>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2">
                        <Euro className="h-4 w-4" />
                        <span className="text-sm">
                          {formatPrice(
                            userRole === 'DELIVERER'
                              ? selectedMatch.announcement.suggestedPrice
                              : selectedMatch.matching.priceEstimate
                          )}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t('matchingDetails')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">{t('distance')}</span>
                        <span className="text-sm font-medium">
                          {selectedMatch.matching.distance.toFixed(1)} km
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm">{t('estimatedDuration')}</span>
                        <span className="text-sm font-medium">
                          {selectedMatch.matching.estimatedDuration}
                        </span>
                      </div>
                      
                      {selectedMatch.matching.detourPercentage > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm">{t('detour')}</span>
                          <span className="text-sm font-medium">
                            +{selectedMatch.matching.detourPercentage}%
                          </span>
                        </div>
                      )}
                      
                      <div className="flex justify-between">
                        <span className="text-sm">{t('estimatedEarnings')}</span>
                        <span className="text-sm font-medium">
                          {formatPrice(selectedMatch.matching.priceEstimate)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Raisons du matching */}
              <div>
                <h4 className="font-medium mb-3">{t('whyThisMatch')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {selectedMatch.matching.reasons.map((reason, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{t(`reasons.${reason}`)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                {onContact && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      onContact(
                        userRole === 'DELIVERER'
                          ? selectedMatch.announcement.client.id
                          : selectedMatch.route.deliverer.id
                      );
                      setSelectedMatch(null);
                    }}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    {t('contact')}
                  </Button>
                )}
                
                {onApply && (
                  <Button
                    onClick={() => {
                      onApply(selectedMatch.id);
                      setSelectedMatch(null);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {userRole === 'DELIVERER' ? t('apply') : t('accept')}
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AnnouncementMatchingDisplay;