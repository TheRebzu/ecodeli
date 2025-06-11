'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Camera,
  Upload,
  Check,
  X,
  QrCode,
  AlertCircle,
  CheckCircle,
  Loader2,
  MapPin,
  Package,
  User,
  Phone,
  MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils/common';
import { toast } from 'sonner';

interface ValidationPhoto {
  id: string;
  url: string;
  file?: File;
  type: 'package' | 'location' | 'signature' | 'damage';
  description?: string;
}

interface DeliveryInfo {
  id: string;
  title: string;
  pickupAddress: string;
  deliveryAddress: string;
  clientName: string;
  clientPhone?: string;
  specialInstructions?: string;
  requiresSignature: boolean;
  requiresId: boolean;
  isFragile: boolean;
  weight?: number;
}

interface DeliveryCodeValidatorProps {
  deliveryInfo: DeliveryInfo;
  onValidateCode: (code: string, photos: ValidationPhoto[], location?: GeolocationPosition) => Promise<boolean>;
  onContactClient?: () => void;
  isValidating?: boolean;
  className?: string;
}

export const DeliveryCodeValidator: React.FC<DeliveryCodeValidatorProps> = ({
  deliveryInfo,
  onValidateCode,
  onContactClient,
  isValidating = false,
  className,
}) => {
  const t = useTranslations('delivery');
  const [code, setCode] = useState('');
  const [photos, setPhotos] = useState<ValidationPhoto[]>([]);
  const [currentLocation, setCurrentLocation] = useState<GeolocationPosition | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Nettoyer le stream de la caméra lors du démontage
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Obtenir la localisation actuelle
  const getCurrentLocation = () => {
    setIsLocationLoading(true);
    
    if (!navigator.geolocation) {
      toast.error(t('geolocationNotSupported'));
      setIsLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation(position);
        setIsLocationLoading(false);
        toast.success(t('locationObtained'));
      },
      (error) => {
        console.error('Erreur de géolocalisation:', error);
        toast.error(t('locationError'));
        setIsLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  };

  // Démarrer la caméra
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Caméra arrière préférée
        audio: false,
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setShowCamera(true);
    } catch (error) {
      console.error('Erreur caméra:', error);
      toast.error(t('cameraError'));
    }
  };

  // Arrêter la caméra
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  // Prendre une photo avec la caméra
  const capturePhoto = (type: ValidationPhoto['type']) => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;

      const file = new File([blob], `${type}-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);

      const newPhoto: ValidationPhoto = {
        id: `${type}-${Date.now()}`,
        url,
        file,
        type,
        description: t(`photoTypes.${type}`),
      };

      setPhotos(prev => [...prev, newPhoto]);
      toast.success(t('photoAdded'));
      stopCamera();
    }, 'image/jpeg', 0.8);
  };

  // Gérer l'upload de fichier
  const handleFileUpload = (type: ValidationPhoto['type']) => {
    const input = fileInputRef.current;
    if (!input) return;

    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const url = URL.createObjectURL(file);
      const newPhoto: ValidationPhoto = {
        id: `${type}-${Date.now()}`,
        url,
        file,
        type,
        description: t(`photoTypes.${type}`),
      };

      setPhotos(prev => [...prev, newPhoto]);
      toast.success(t('photoAdded'));
    };

    input.click();
  };

  // Supprimer une photo
  const removePhoto = (photoId: string) => {
    setPhotos(prev => {
      const photo = prev.find(p => p.id === photoId);
      if (photo?.url) {
        URL.revokeObjectURL(photo.url);
      }
      return prev.filter(p => p.id !== photoId);
    });
  };

  // Formater le code pendant la saisie
  const handleCodeChange = (value: string) => {
    // Nettoyer et formater le code
    const cleanCode = value.replace(/\s/g, '').toUpperCase();
    if (cleanCode.length <= 6) {
      setCode(cleanCode);
      setValidationError(null);
    }
  };

  // Valider la livraison
  const handleValidation = async () => {
    if (!code.trim()) {
      setValidationError(t('codeRequired'));
      return;
    }

    if (code.length !== 6) {
      setValidationError(t('codeInvalidLength'));
      return;
    }

    // Vérifier les photos requises
    const requiredPhotoTypes: ValidationPhoto['type'][] = ['package'];
    
    if (deliveryInfo.requiresSignature) {
      requiredPhotoTypes.push('signature');
    }

    for (const type of requiredPhotoTypes) {
      if (!photos.some(p => p.type === type)) {
        setValidationError(t('missingRequiredPhoto', { type: t(`photoTypes.${type}`) }));
        return;
      }
    }

    try {
      setValidationError(null);
      const success = await onValidateCode(code, photos, currentLocation || undefined);
      
      if (success) {
        toast.success(t('deliveryValidated'));
        // Réinitialiser le formulaire
        setCode('');
        setPhotos([]);
        setCurrentLocation(null);
      } else {
        setValidationError(t('validationFailed'));
      }
    } catch (error) {
      console.error('Erreur validation:', error);
      setValidationError(t('validationError'));
    }
  };

  // Types de photos disponibles
  const photoTypes: Array<{ type: ValidationPhoto['type']; label: string; required: boolean }> = [
    { type: 'package', label: t('photoTypes.package'), required: true },
    { type: 'location', label: t('photoTypes.location'), required: false },
    { type: 'signature', label: t('photoTypes.signature'), required: deliveryInfo.requiresSignature },
    { type: 'damage', label: t('photoTypes.damage'), required: false },
  ];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Informations de livraison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>{t('deliveryInformation')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium">{deliveryInfo.title}</h4>
            <p className="text-sm text-muted-foreground">ID: {deliveryInfo.id}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <div className="font-medium text-green-700">{t('pickup')}</div>
                  <div className="text-muted-foreground">{deliveryInfo.pickupAddress}</div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-red-500 mt-0.5" />
                <div>
                  <div className="font-medium text-red-700">{t('delivery')}</div>
                  <div className="text-muted-foreground">{deliveryInfo.deliveryAddress}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span className="font-medium">{deliveryInfo.clientName}</span>
            </div>
            {deliveryInfo.clientPhone && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`tel:${deliveryInfo.clientPhone}`)}
              >
                <Phone className="h-4 w-4 mr-1" />
                {t('call')}
              </Button>
            )}
            {onContactClient && (
              <Button
                variant="outline"
                size="sm"
                onClick={onContactClient}
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                {t('message')}
              </Button>
            )}
          </div>

          {/* Badges pour les exigences spéciales */}
          <div className="flex flex-wrap gap-2">
            {deliveryInfo.requiresSignature && (
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                {t('requiresSignature')}
              </Badge>
            )}
            {deliveryInfo.requiresId && (
              <Badge variant="outline" className="text-blue-600 border-blue-200">
                {t('requiresId')}
              </Badge>
            )}
            {deliveryInfo.isFragile && (
              <Badge variant="outline" className="text-red-600 border-red-200">
                {t('fragile')}
              </Badge>
            )}
            {deliveryInfo.weight && (
              <Badge variant="outline">
                {deliveryInfo.weight} kg
              </Badge>
            )}
          </div>

          {deliveryInfo.specialInstructions && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('specialInstructions')}</AlertTitle>
              <AlertDescription>{deliveryInfo.specialInstructions}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Validation du code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5" />
            <span>{t('validateDelivery')}</span>
          </CardTitle>
          <CardDescription>
            {t('validateDeliveryDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Saisie du code */}
          <div className="space-y-2">
            <Label htmlFor="validation-code">{t('validationCode')}</Label>
            <Input
              id="validation-code"
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="ABC123"
              className="text-center text-2xl font-mono tracking-widest"
              maxLength={6}
              disabled={isValidating}
            />
            <p className="text-sm text-muted-foreground">
              {t('enterCodeFromClient')}
            </p>
          </div>

          {/* Localisation */}
          <div className="space-y-2">
            <Label>{t('currentLocation')}</Label>
            <div className="flex items-center space-x-2">
              {currentLocation ? (
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">
                    {t('locationObtained')} ({currentLocation.coords.latitude.toFixed(6)}, {currentLocation.coords.longitude.toFixed(6)})
                  </span>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={getCurrentLocation}
                  disabled={isLocationLoading}
                >
                  {isLocationLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <MapPin className="h-4 w-4 mr-2" />
                  )}
                  {t('getLocation')}
                </Button>
              )}
            </div>
          </div>

          {/* Photos de validation */}
          <div className="space-y-4">
            <Label>{t('validationPhotos')}</Label>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {photoTypes.map(({ type, label, required }) => {
                const hasPhoto = photos.some(p => p.type === type);
                
                return (
                  <Card key={type} className={cn(
                    'relative',
                    required && !hasPhoto && 'border-red-200 bg-red-50',
                    hasPhoto && 'border-green-200 bg-green-50'
                  )}>
                    <CardContent className="p-4 text-center">
                      <div className="space-y-2">
                        <div className="text-sm font-medium">{label}</div>
                        {required && (
                          <Badge variant="outline" className="text-xs">
                            {t('required')}
                          </Badge>
                        )}
                        
                        {hasPhoto ? (
                          <div className="space-y-2">
                            <CheckCircle className="h-6 w-6 text-green-500 mx-auto" />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const photo = photos.find(p => p.type === type);
                                if (photo) removePhoto(photo.id);
                              }}
                            >
                              <X className="h-3 w-3 mr-1" />
                              {t('remove')}
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex space-x-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => startCamera()}
                                className="flex-1"
                              >
                                <Camera className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleFileUpload(type)}
                                className="flex-1"
                              >
                                <Upload className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Galerie des photos prises */}
            {photos.length > 0 && (
              <div className="space-y-2">
                <Label>{t('capturedPhotos')}</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <img
                        src={photo.url}
                        alt={photo.description}
                        className="w-full h-24 object-cover rounded border"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removePhoto(photo.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <Badge className="absolute bottom-1 left-1 text-xs">
                        {t(`photoTypes.${photo.type}`)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Erreur de validation */}
          {validationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('validationError')}</AlertTitle>
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          {/* Bouton de validation */}
          <Button
            onClick={handleValidation}
            disabled={isValidating || !code.trim() || code.length !== 6}
            className="w-full"
            size="lg"
          >
            {isValidating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            {t('validateDelivery')}
          </Button>
        </CardContent>
      </Card>

      {/* Modal caméra */}
      <Dialog open={showCamera} onOpenChange={setShowCamera}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('takePhoto')}</DialogTitle>
            <DialogDescription>
              {t('takePhotoDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded border"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {photoTypes.map(({ type, label }) => (
                <Button
                  key={type}
                  variant="outline"
                  onClick={() => capturePhoto(type)}
                  className="text-sm"
                >
                  {label}
                </Button>
              ))}
            </div>
            
            <Button
              variant="outline"
              onClick={stopCamera}
              className="w-full"
            >
              {t('cancel')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Input file caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
      />
    </div>
  );
};

export default DeliveryCodeValidator;