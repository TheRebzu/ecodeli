import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Wifi, 
  WifiOff, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Settings,
  RefreshCw,
  Zap
} from 'lucide-react';

interface GeolocationStatusProps {
  status: 'active' | 'requesting' | 'inactive' | 'degraded' | 'error' | 'timeout';
  error?: string | null;
  accuracy?: number | null;
  lastUpdate?: Date | null;
  retryCount?: number;
  maxRetries?: number;
  onRetry?: () => void;
  onOpenSettings?: () => void;
  className?: string;
}

export function GeolocationStatus({
  status,
  error,
  accuracy,
  lastUpdate,
  retryCount = 0,
  maxRetries = 3,
  onRetry,
  onOpenSettings,
  className = ''
}: GeolocationStatusProps) {

  const getStatusConfig = () => {
    switch (status) {
      case 'active':
        return {
          variant: 'default' as const,
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50 border-green-200',
          title: '🟢 GPS Actif',
          description: 'Votre position est suivie en temps réel',
          showAccuracy: true,
          actions: []
        };

      case 'requesting':
        return {
          variant: 'default' as const,
          icon: RefreshCw,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 border-blue-200',
          title: '🔵 Localisation en cours...',
          description: 'Recherche de votre position GPS',
          showAccuracy: false,
          actions: []
        };

      case 'degraded':
        return {
          variant: 'default' as const,
          icon: MapPin,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50 border-orange-200',
          title: '🟡 GPS Dégradé',
          description: 'Position détectée mais avec une précision réduite',
          showAccuracy: true,
          actions: [
            {
              label: 'Améliorer la précision',
              icon: Settings,
              onClick: onOpenSettings,
              variant: 'outline' as const
            }
          ]
        };

      case 'timeout':
        return {
          variant: 'destructive' as const,
          icon: Clock,
          color: 'text-red-600',
          bgColor: 'bg-red-50 border-red-200',
          title: '🔴 Délai dépassé',
          description: 'La géolocalisation prend trop de temps à répondre',
          showAccuracy: false,
          actions: [
            {
              label: 'Réessayer',
              icon: RefreshCw,
              onClick: onRetry,
              variant: 'outline' as const
            },
            {
              label: 'Aide',
              icon: Settings,
              onClick: onOpenSettings,
              variant: 'ghost' as const
            }
          ]
        };

      case 'error':
        return {
          variant: 'destructive' as const,
          icon: AlertCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50 border-red-200',
          title: '🔴 Erreur GPS',
          description: error || 'Impossible d\'accéder à votre position',
          showAccuracy: false,
          actions: [
            {
              label: 'Réessayer',
              icon: RefreshCw,
              onClick: onRetry,
              variant: 'outline' as const
            },
            {
              label: 'Aide',
              icon: Settings,
              onClick: onOpenSettings,
              variant: 'ghost' as const
            }
          ]
        };

      case 'inactive':
      default:
        return {
          variant: 'default' as const,
          icon: WifiOff,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50 border-gray-200',
          title: '⚫ GPS Inactif',
          description: 'Le suivi de position n\'est pas activé',
          showAccuracy: false,
          actions: [
            {
              label: 'Activer',
              icon: MapPin,
              onClick: onRetry,
              variant: 'default' as const
            }
          ]
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const getTroubleshootingTips = () => {
    if (status === 'error' || status === 'timeout') {
      return (
        <div className="mt-3 p-3 bg-gray-50 rounded-md">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            💡 Solutions possibles :
          </h4>
          <ul className="text-xs text-gray-700 space-y-1">
            <li>• Vérifiez que le GPS est activé sur votre appareil</li>
            <li>• Autorisez l'accès à la position pour ce site</li>
            <li>• Sortez à l'extérieur pour un meilleur signal</li>
            <li>• Redémarrez votre navigateur si le problème persiste</li>
            <li>• Vérifiez votre connexion internet</li>
          </ul>
        </div>
      );
    }
    return null;
  };

  const getPermissionInstructions = () => {
    if (error?.includes('Permission') || error?.includes('denied')) {
      return (
        <div className="mt-3 p-3 bg-blue-50 rounded-md">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            🔒 Autoriser l'accès à la position :
          </h4>
          <div className="text-xs text-blue-800 space-y-1">
            <p><strong>Chrome/Edge :</strong> Cliquez sur l'icône 🔒 dans la barre d'adresse</p>
            <p><strong>Firefox :</strong> Cliquez sur l'icône 🛡️ à gauche de l'URL</p>
            <p><strong>Safari :</strong> Safari → Préférences → Sites web → Localisation</p>
            <p><strong>Mobile :</strong> Paramètres → Apps → Navigateur → Autorisations</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={className}>
      <Alert variant={config.variant} className={config.bgColor}>
        <Icon className={`h-4 w-4 ${config.color} ${status === 'requesting' ? 'animate-spin' : ''}`} />
        <AlertDescription>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="font-medium">{config.title}</div>
              <div className="text-sm mt-1">{config.description}</div>
              
              {/* Informations détaillées */}
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                {config.showAccuracy && accuracy && (
                  <span>Précision: ±{Math.round(accuracy)}m</span>
                )}
                {lastUpdate && (
                  <span>Mis à jour: {lastUpdate.toLocaleTimeString()}</span>
                )}
                {retryCount > 0 && (
                  <span className="text-orange-600">
                    Tentative {retryCount}/{maxRetries}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            {config.actions.length > 0 && (
              <div className="flex gap-2 ml-4">
                {config.actions.map((action, index) => (
                  <Button
                    key={index}
                    size="sm"
                    variant={action.variant}
                    onClick={action.onClick}
                    className="h-8"
                  >
                    <action.icon className="h-3 w-3 mr-1" />
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Instructions de permission */}
          {getPermissionInstructions()}

          {/* Conseils de dépannage */}
          {getTroubleshootingTips()}

          {/* Performance indicators */}
          {status === 'active' && accuracy && (
            <div className="mt-3 flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                <span>
                  Signal: {accuracy <= 10 ? 'Excellent' : accuracy <= 50 ? 'Bon' : accuracy <= 100 ? 'Correct' : 'Faible'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Wifi className="h-3 w-3" />
                <span>Temps réel</span>
              </div>
            </div>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}

// Hook pour gérer l'état de géolocalisation
export function useGeolocationStatus() {
  const [status, setStatus] = React.useState<GeolocationStatusProps['status']>('inactive');
  const [error, setError] = React.useState<string | null>(null);
  const [accuracy, setAccuracy] = React.useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = React.useState<Date | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);

  const updateStatus = React.useCallback((
    newStatus: GeolocationStatusProps['status'],
    errorMessage?: string,
    accuracyValue?: number
  ) => {
    setStatus(newStatus);
    setError(errorMessage || null);
    setAccuracy(accuracyValue || null);
    setLastUpdate(new Date());
    
    if (newStatus === 'active') {
      setRetryCount(0);
    }
  }, []);

  const incrementRetry = React.useCallback(() => {
    setRetryCount(prev => prev + 1);
  }, []);

  const resetRetry = React.useCallback(() => {
    setRetryCount(0);
  }, []);

  return {
    status,
    error,
    accuracy,
    lastUpdate,
    retryCount,
    updateStatus,
    incrementRetry,
    resetRetry
  };
} 