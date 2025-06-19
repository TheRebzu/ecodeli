import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/trpc/react";

export interface NFCCardData {
  id: string;
  delivererId: string;
  cardNumber: string;
  isActive: boolean;
  lastUsed?: Date;
  totalScans: number;
  metadata?: Record<string, any>;
}

export interface NFCScanResult {
  success: boolean;
  data?: {
    cardId: string;
    delivererId: string;
    deliveryId?: string;
    timestamp: Date;
    location?: {
      latitude: number;
      longitude: number;
    };
  };
  error?: string;
}

export interface UseNFCCardOptions {
  autoStart?: boolean;
  enableLocation?: boolean;
  timeout?: number;
}

declare global {
  interface Window {
    NDEFReader: any;
  }
}

export function useNFCCard(
  delivererId: string,
  options: UseNFCCardOptions = {}
) {
  const { autoStart = false, enableLocation = true, timeout = 10000 } = options;
  const { toast } = useToast();
  
  const [isScanning, setIsScanning] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [lastScan, setLastScan] = useState<NFCScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const readerRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Vérifier le support NFC
  useEffect(() => {
    const checkNFCSupport = () => {
      if ('NDEFReader' in window) {
        setIsSupported(true);
      } else {
        setIsSupported(false);
        setError("NFC non supporté sur cet appareil");
      }
    };

    checkNFCSupport();
  }, []);

  // Requête pour récupérer les cartes NFC du livreur
  const {
    data: nfcCards,
    isLoading: cardsLoading,
    refetch: refetchCards
  } = api.deliverer.nfc.getMyCards.useQuery({
    delivererId
  }, {
    enabled: !!delivererId
  });

  // Mutation pour enregistrer un scan NFC
  const recordScanMutation = api.deliverer.nfc.recordScan.useMutation({
    onSuccess: (result) => {
      setLastScan({
        success: true,
        data: result
      });
      
      toast({
        title: "Scan NFC réussi",
        description: "La carte a été scannée avec succès",
        variant: "default"
      });
      
      refetchCards();
    },
    onError: (error) => {
      setLastScan({
        success: false,
        error: error.message
      });
      
      toast({
        title: "Erreur de scan",
        description: error.message || "Impossible d'enregistrer le scan",
        variant: "destructive"
      });
    }
  });

  // Mutation pour créer une nouvelle carte NFC
  const createCardMutation = api.deliverer.nfc.createCard.useMutation({
    onSuccess: () => {
      toast({
        title: "Carte créée",
        description: "Nouvelle carte NFC créée avec succès",
        variant: "default"
      });
      refetchCards();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la carte",
        variant: "destructive"
      });
    }
  });

  // Démarrer le scan NFC
  const startScan = useCallback(async (deliveryId?: string) => {
    if (!isSupported) {
      setError("NFC non supporté");
      return;
    }

    if (isScanning) {
      return;
    }

    try {
      setIsScanning(true);
      setError(null);

      // Créer un nouveau lecteur NFC
      readerRef.current = new window.NDEFReader();

      // Demander les permissions
      await readerRef.current.scan();

      // Gérer la lecture des données
      readerRef.current.addEventListener('reading', async (event: any) => {
        try {
          const message = event.message;
          const records = message.records;

          if (records && records.length > 0) {
            const firstRecord = records[0];
            
            // Décoder les données NFC
            const decoder = new TextDecoder();
            const data = decoder.decode(firstRecord.data);
            
            // Parser les données JSON
            let cardData;
            try {
              cardData = JSON.parse(data);
            } catch {
              // Si ce n'est pas du JSON, traiter comme un ID simple
              cardData = { cardId: data };
            }

            // Obtenir la position si demandé
            let location;
            if (enableLocation && 'geolocation' in navigator) {
              try {
                const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                  navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 60000
                  });
                });
                
                location = {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude
                };
              } catch (error) {
                console.warn("Impossible d'obtenir la position:", error);
              }
            }

            // Enregistrer le scan
            recordScanMutation.mutate({
              delivererId,
              cardData,
              deliveryId,
              location
            });

            // Arrêter le scan après succès
            stopScan();
          }
        } catch (error) {
          console.error("Erreur lors du traitement du scan NFC:", error);
          setError("Erreur lors du traitement des données NFC");
          stopScan();
        }
      });

      readerRef.current.addEventListener('readingerror', () => {
        setError("Erreur de lecture NFC");
        stopScan();
      });

      // Timeout pour arrêter le scan automatiquement
      if (timeout > 0) {
        timeoutRef.current = setTimeout(() => {
          setError("Timeout: aucune carte détectée");
          stopScan();
        }, timeout);
      }

    } catch (error: any) {
      console.error("Erreur lors du démarrage du scan NFC:", error);
      
      if (error.name === 'NotAllowedError') {
        setError("Permission NFC refusée");
      } else if (error.name === 'NotSupportedError') {
        setError("NFC non supporté");
      } else {
        setError("Erreur lors du démarrage du scan");
      }
      
      setIsScanning(false);
    }
  }, [isSupported, isScanning, delivererId, enableLocation, timeout, recordScanMutation]);

  // Arrêter le scan NFC
  const stopScan = useCallback(() => {
    if (readerRef.current) {
      try {
        readerRef.current.abort?.();
      } catch (error) {
        console.warn("Erreur lors de l'arrêt du scan:", error);
      }
      readerRef.current = null;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setIsScanning(false);
  }, []);

  // Écrire des données sur une carte NFC
  const writeCard = useCallback(async (cardData: {
    cardId: string;
    delivererId: string;
    metadata?: Record<string, any>;
  }) => {
    if (!isSupported) {
      throw new Error("NFC non supporté");
    }

    try {
      const writer = new window.NDEFReader();
      
      const message = {
        records: [{
          recordType: "text",
          data: JSON.stringify(cardData)
        }]
      };

      await writer.write(message);
      
      toast({
        title: "Carte programmée",
        description: "Les données ont été écrites sur la carte NFC",
        variant: "default"
      });

      return true;
    } catch (error: any) {
      console.error("Erreur lors de l'écriture NFC:", error);
      
      if (error.name === 'NotAllowedError') {
        throw new Error("Permission NFC refusée");
      } else if (error.name === 'NotSupportedError') {
        throw new Error("écriture NFC non supportée");
      } else {
        throw new Error("Erreur lors de l'écriture sur la carte");
      }
    }
  }, [isSupported, toast]);

  // Créer une nouvelle carte NFC
  const createCard = useCallback((metadata?: Record<string, any>) => {
    createCardMutation.mutate({
      delivererId,
      metadata
    });
  }, [delivererId, createCardMutation]);

  // Démarrage automatique si demandé
  useEffect(() => {
    if (autoStart && isSupported && !isScanning) {
      startScan();
    }

    // Cleanup lors du démontage
    return () => {
      stopScan();
    };
  }, [autoStart, isSupported, startScan, stopScan]);

  // Nettoyer les timeouts lors du démontage
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    // État
    isScanning,
    isSupported,
    error,
    lastScan,
    
    // Données
    nfcCards: nfcCards || [],
    isLoading: cardsLoading,
    
    // Actions
    startScan,
    stopScan,
    writeCard,
    createCard,
    
    // États des mutations
    isRecordingLAScan: recordScanMutation.isPending,
    isCreatingCard: createCardMutation.isPending,
    
    // Utilitaires
    clearError: () => setError(null),
    clearLastScan: () => setLastScan(null),
  };
}

// Hook pour la validation de livraison via NFC
export function useNFCDeliveryValidation(delivererId: string) {
  const { startScan, stopScan, isScanning, lastScan, error } = useNFCCard(delivererId, {
    enableLocation: true,
    timeout: 15000
  });

  const validateDeliveryMutation = api.deliverer.deliveries.validateWithNFC.useMutation();

  const validateDelivery = useCallback(async (deliveryId: string) => {
    try {
      // Démarrer le scan NFC pour cette livraison
      await startScan(deliveryId);
      
      // Le scan sera traité automatiquement par le hook parent
      // et la validation sera déclenchée via recordScanMutation
      
    } catch (error) {
      console.error("Erreur validation livraison NFC:", error);
      throw error;
    }
  }, [startScan]);

  useEffect(() => {
    // Si un scan réussi contient un deliveryId, valider automatiquement
    if (lastScan?.success && lastScan.data?.deliveryId) {
      validateDeliveryMutation.mutate({
        deliveryId: lastScan.data.deliveryId,
        nfcData: lastScan.data
      });
    }
  }, [lastScan, validateDeliveryMutation]);

  return {
    validateDelivery,
    isValidating: isScanning || validateDeliveryMutation.isPending,
    validationResult: lastScan,
    error,
    stopValidation: stopScan
  };
}

// Hook pour scanner les codes QR comme alternative au NFC
export function useQRCodeScanner(delivererId: string) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanResult, setLastScanResult] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>();

  const { toast } = useToast();

  // Mutation pour enregistrer le scan QR
  const recordQRScanMutation = api.deliverer.nfc.recordQRScan.useMutation({
    onSuccess: (data) => {
      setLastScanResult(data);
      toast({
        title: "QR Code scanné",
        description: "Code QR traité avec succès",
        variant: "default"
      });
    },
    onError: (error) => {
      setError(error.message);
      toast({
        title: "Erreur de scan",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Fonction de scan QR utilisant jsQR
  const scanQRCode = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    // Utilisation de jsQR pour décoder le QR code
    try {
      // En production, installer jsQR : npm install jsqr @types/jsqr
      // const code = jsQR(imageData.data, imageData.width, imageData.height);
      
      // Pour l'instant, fallback sur API de détection native du navigateur
      // qui sera remplacée par jsQR quand la dépendance sera installée
      const barcodeDetector = new (window as any).BarcodeDetector({
        formats: ['qr_code']
      });
      
      barcodeDetector.detect(canvas)
        .then(async (barcodes: any[]) => {
          if (barcodes.length > 0) {
            const barcode = barcodes[0];
            try {
              const qrData = JSON.parse(barcode.rawValue);
              
              // Valider le format des données QR
              if (qrData.type === 'delivery_validation' && qrData.deliveryId) {
                // Enregistrer le scan
                recordQRScanMutation.mutate({
                  delivererId,
                  qrData,
                  scannedAt: new Date(),
                  location: navigator.geolocation ? await getCurrentPosition() : undefined
                });

                stopQRScan();
                return;
              }
            } catch (parseError) {
              console.error("Erreur parsing QR data:", parseError);
              setError("Format de QR code invalide");
            }
          }
          
          // Continuer le scan si aucun QR code valide détecté
          if (isScanning) {
            animationRef.current = requestAnimationFrame(scanQRCode);
          }
        })
        .catch((error: any) => {
          console.error("Erreur détection QR:", error);
          // Fallback : continuer le scan
          if (isScanning) {
            animationRef.current = requestAnimationFrame(scanQRCode);
          }
        });
        
    } catch (error) {
      console.error("Erreur scan QR:", error);
      // Continuer le scan même en cas d'erreur
      if (isScanning) {
        animationRef.current = requestAnimationFrame(scanQRCode);
      }
    }
  }, [delivererId, isScanning, recordQRScanMutation]);

  // Obtenir la position actuelle
  const getCurrentPosition = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Géolocalisation non supportée"));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      });
    });
  }, []);

  const startQRScan = useCallback(async () => {
    try {
      setIsScanning(true);
      setError(null);
      setLastScanResult(null);

      // Demander l'accès à la caméra
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Caméra arrière
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        
        // Démarrer le scan une fois la vidéo prête
        videoRef.current.addEventListener('loadedmetadata', () => {
          scanQRCode();
        });
      }
      
    } catch (error: any) {
      console.error("Erreur accès caméra:", error);
      let errorMessage = "Impossible d'accéder à la caméra";
      
      if (error.name === 'NotAllowedError') {
        errorMessage = "Permission caméra refusée";
      } else if (error.name === 'NotFoundError') {
        errorMessage = "Aucune caméra trouvée";
      } else if (error.name === 'NotReadableError') {
        errorMessage = "Caméra déjà utilisée par une autre application";
      }
      
      setError(errorMessage);
      setIsScanning(false);
    }
  }, [scanQRCode]);

  const stopQRScan = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
  }, []);

  useEffect(() => {
    return () => {
      stopQRScan();
    };
  }, [stopQRScan]);

  return {
    isScanning,
    error,
    lastScanResult,
    videoRef,
    canvasRef,
    startQRScan,
    stopQRScan,
    clearError: () => setError(null),
    clearResult: () => setLastScanResult(null),
    isProcessing: recordQRScanMutation.isPending
  };
}