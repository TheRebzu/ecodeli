'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Announcement, AnnouncementStatus } from '@/types/announcement';
import { useAnnouncement } from '@/hooks/use-announcement';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AnnouncementCard } from '@/components/announcements/announcement-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { MapPin, Search, ListFilter, Map as MapIcon, Clock, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EmptyState } from '@/components/ui/empty-state';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Package, Euro, Calendar, Heart, Filter, ArrowUpDown, Truck } from 'lucide-react';

interface AvailableAnnouncementsProps {
  announcements: Announcement[];
  nearbyAnnouncements?: Announcement[];
  suggestedAnnouncements?: Announcement[];
  favoriteAnnouncements?: Announcement[];
  isLoading?: boolean;
  onSelectAnnouncement: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

export function AvailableAnnouncements({
  announcements,
  nearbyAnnouncements = [],
  suggestedAnnouncements = [],
  favoriteAnnouncements = [],
  isLoading = false,
  onSelectAnnouncement,
  onToggleFavorite,
}: AvailableAnnouncementsProps) {
  const t = useTranslations('announcements');
  const router = useRouter();
  const [view, setView] = useState<'list' | 'map'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [maxDistance, setMaxDistance] = useState<number>(50);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'distance' | 'price'>('date');
  const [filterFavorites, setFilterFavorites] = useState(false);

  // Filtrer les annonces en fonction de la recherche
  const filteredAnnouncements = announcements.filter(
    announcement =>
      announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      announcement.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      announcement.pickupAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      announcement.deliveryAddress.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Détermine quel ensemble d'annonces afficher en fonction de l'onglet sélectionné
  const getAnnouncementsToDisplay = () => {
    switch (selectedTab) {
      case 'nearby':
        return nearbyAnnouncements;
      case 'suggested':
        return suggestedAnnouncements;
      case 'favorites':
        return favoriteAnnouncements;
      case 'all':
      default:
        return filteredAnnouncements;
    }
  };

  const displayedAnnouncements = getAnnouncementsToDisplay();

  // Fonction pour trier les annonces
  const sortAnnouncements = (sortBy: string) => {
    // Implémenter la logique de tri
    console.log('Sort by:', sortBy);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <CardTitle>{t('availableDeliveries')}</CardTitle>
              <CardDescription>{t('availableDeliveriesDescription')}</CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Input
                  placeholder={t('searchAnnouncements')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full sm:w-[200px] pr-8"
                />
                <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <ListFilter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  <DropdownMenuLabel>{t('sortBy')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => sortAnnouncements('date-desc')}>
                      <Clock className="mr-2 h-4 w-4" />
                      <span>{t('newest')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => sortAnnouncements('price-desc')}>
                      <Star className="mr-2 h-4 w-4" />
                      <span>{t('highestPrice')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => sortAnnouncements('distance')}>
                      <MapPin className="mr-2 h-4 w-4" />
                      <span>{t('nearest')}</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setView(view === 'list' ? 'map' : 'list')}
              >
                {view === 'list' ? (
                  <MapIcon className="h-4 w-4" />
                ) : (
                  <ListFilter className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs
            defaultValue="all"
            value={selectedTab}
            onValueChange={value => setSelectedTab(value)}
          >
            <div className="px-6 border-b">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="all">
                  {t('all')} ({filteredAnnouncements.length})
                </TabsTrigger>
                <TabsTrigger value="nearby">
                  {t('nearby')} ({nearbyAnnouncements.length})
                </TabsTrigger>
                <TabsTrigger value="suggested">
                  {t('suggested')} ({suggestedAnnouncements.length})
                </TabsTrigger>
                <TabsTrigger value="favorites">
                  {t('favorites')} ({favoriteAnnouncements.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="px-6 py-4">
              {view === 'list' ? (
                <TabsContent value={selectedTab} className="m-0">
                  {isLoading ? (
                    <div className="flex justify-center items-center py-8">
                      <div className="animate-pulse space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="w-full h-32 bg-muted rounded-lg" />
                        ))}
                      </div>
                    </div>
                  ) : displayedAnnouncements.length === 0 ? (
                    <EmptyState
                      icon={<SearchIcon />}
                      title={t('noAnnouncementsFound')}
                      description={t('noAnnouncementsFoundDescription')}
                      action={
                        <Button variant="outline" onClick={() => setSearchQuery('')}>
                          {t('clearSearch')}
                        </Button>
                      }
                    />
                  ) : (
                    <ScrollArea className="h-[calc(100vh-300px)] pr-4">
                      <div className="space-y-4">
                        {displayedAnnouncements.map(announcement => (
                          <AnnouncementCard
                            key={announcement.id}
                            announcement={announcement}
                            isClientView={false}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </TabsContent>
              ) : (
                <div className="w-full h-[calc(100vh-300px)] bg-muted rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">{t('mapViewComingSoon')}</p>
                </div>
              )}
            </div>
          </Tabs>
        </CardContent>

        <CardFooter className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {displayedAnnouncements.length} {t('announcementsFound')}
          </p>
          <Button variant="default" onClick={() => router.push('/deliverer/announcements/matches')}>
            {t('findMatchesForMyRoutes')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// Composant pour l'icône de recherche (pour l'état vide)
function SearchIcon() {
  return (
    <div className="w-12 h-12 rounded-full bg-muted-foreground/20 flex items-center justify-center">
      <Search className="h-6 w-6 text-muted-foreground" />
    </div>
  );
}
