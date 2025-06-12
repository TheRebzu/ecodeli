import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import { BoxWithWarehouse } from '@/types/warehouses/storage-box';
import {
  Calendar,
  ClipboardCheck,
  Lock,
  MapPin,
  Package,
  Ruler,
  ShieldCheck,
  Snowflake,
  Timer,
  Truck,
} from 'lucide-react';

interface BoxDetailCardProps {
  box: BoxWithWarehouse;
  onSelect: (box: BoxWithWarehouse) => void;
  startDate: Date;
  endDate: Date;
  showReserveButton?: boolean;
  compact?: boolean;
}

export function BoxDetailCard({
  box,
  onSelect,
  startDate,
  endDate,
  showReserveButton = true,
  compact = false,
}: BoxDetailCardProps) {
  const t = useTranslations('storage');

  const durationInDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const totalPrice = durationInDays * box.pricePerDay;

  // Correspondance des icônes par type de box
  const getBoxTypeIcon = (type: string) => {
    switch (type) {
      case 'CLIMATE_CONTROLLED':
        return <Snowflake className="h-4 w-4" />;
      case 'SECURE':
        return <ShieldCheck className="h-4 w-4" />;
      case 'EXTRA_LARGE':
        return <Package className="h-4 w-4" />;
      case 'REFRIGERATED':
        return <Snowflake className="h-4 w-4" />;
      case 'FRAGILE':
        return <ClipboardCheck className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getBoxTypeLabel = (type: string) => {
    return t(`boxTypes.${type.toLowerCase()}`);
  };

  return (
    <Card className={`overflow-hidden ${compact ? 'h-full' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg md:text-xl">{box.name}</CardTitle>
            <CardDescription>{box.warehouse.name}</CardDescription>
          </div>
          <Badge className="flex items-center gap-1" variant="outline">
            {getBoxTypeIcon(box.boxType)}
            {getBoxTypeLabel(box.boxType)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className={`space-y-2 ${compact ? 'pb-2' : ''}`}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="space-y-2 flex-1">
            {!compact && <p className="text-sm text-muted-foreground">{box.description}</p>}

            <div className="space-y-1">
              <div className="flex items-center text-sm">
                <Ruler className="h-4 w-4 mr-2" />
                <span>{box.size} m³</span>
                {box.dimensions && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({box.dimensions.width} × {box.dimensions.height} × {box.dimensions.depth})
                  </span>
                )}
              </div>

              <div className="flex items-center text-sm">
                <MapPin className="h-4 w-4 mr-2" />
                <span>{box.warehouse.address}</span>
              </div>

              {box.maxWeight && (
                <div className="flex items-center text-sm">
                  <Truck className="h-4 w-4 mr-2" />
                  <span>
                    {t('boxDetails.maxWeight')}: {box.maxWeight} kg
                  </span>
                </div>
              )}

              {!compact && box.features && box.features.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {box.features.includes('climate-controlled') && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Snowflake className="h-3 w-3" />
                      {t('features.climateControlled')}
                    </Badge>
                  )}
                  {box.features.includes('secure') && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      {t('features.secure')}
                    </Badge>
                  )}
                  {box.features.includes('24h-access') && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      {t('features.24hAccess')}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-between">
            <div className="text-right">
              <div className="text-2xl font-bold">{box.pricePerDay}€</div>
              <p className="text-xs text-muted-foreground">{t('boxDetails.perDay')}</p>
            </div>

            {!compact && (
              <div className="text-right mt-2">
                <div className="text-lg font-semibold">{totalPrice}€</div>
                <p className="text-xs text-muted-foreground">
                  {t('boxDetails.forDuration', { days: durationInDays })}
                </p>
              </div>
            )}
          </div>
        </div>

        {!compact && (
          <div className="pt-2 border-t flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              <span>
                {format(startDate, 'PPP', { locale: fr })} &mdash;{' '}
                {format(endDate, 'PPP', { locale: fr })}
              </span>
            </div>

            {box.warehouse.contactPhone && (
              <div>
                <span>
                  {t('boxDetails.contact')}: {box.warehouse.contactPhone}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {showReserveButton && (
        <CardFooter className={`${compact ? 'pt-0' : ''}`}>
          <Button onClick={() => onSelect(box)} className="w-full">
            {t('boxDetails.reserve')}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

// Composant pour une carte compacte de box (pour les listes résumées)
export function BoxCompactCard({ box, onSelect, startDate, endDate }: BoxDetailCardProps) {
  return (
    <BoxDetailCard box={box} onSelect={onSelect} startDate={startDate} endDate={endDate} compact />
  );
}
