import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
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

  // V�rifier le support NFC
  useEffect(() => {
    const checkNFCSupport = () => {
      if ('NDEFReader' in window) {
        setIsSupported(true);
      } else {
        setIsSupported(false);
        setError("NFC non support� sur cet appareil");
      }
    };

    checkNFCSupport();
  }, []);

  // Requ�te pour r�cup�rer les cartes NFC du livreur
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
        title: "Scan NFC r�ussi",
        description: "La carte a �t� scann�e avec succ�s",
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

  // Mutation pour cr�er une nouvelle carte NFC
  const createCardMutation = api.deliverer.nfc.createCard.useMutation({
    onSuccess: () => {
      toast({
        title: "Carte cr��e",
        description: "Nouvelle carte NFC cr��e avec succ�s",
        variant: "default"
      });
      refetchCards();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de cr�er la carte",
        variant: "destructive"
      });
    }
  });

  // D�marrer le scan NFC
  const startScan = useCallback(async (deliveryId?: string) => {
    if (!isSupported) {
      setError("NFC non support�");
      return;
    }

    if (isScanning) {
      return;
    }

    try {
      setIsScanning(true);
      setError(null);

      // Cr�er un nouveau lecteur NFC
      readerRef.current = new window.NDEFReader();

      // Demander les permissions
      await readerRef.current.scan();

      // G�rer la lecture des donn�es
      readerRef.current.addEventListener('reading', async (event: any) => {
        try {
          const message = event.message;
          const records = message.records;

          if (records && records.length > 0) {
            const firstRecord = records[0];
            
            // D�coder les donn�es NFC
            const decoder = new TextDecoder();
            const data = decoder.decode(firstRecord.data);
            
            // Parser les donn�es JSON
            let cardData;
            try {
              cardData = JSON.parse(data);
            } catch {
              // Si ce n'est pas du JSON, traiter comme un ID simple
              cardData = { cardId: data };
            }

            // Obtenir la position si demand�
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

            // Arr�ter le scan apr�s succ�s
            stopScan();
          }
        } catch (error) {
          console.error("Erreur lors du traitement du scan NFC:", error);
          setError("Erreur lors du traitement des donn�es NFC");
          stopScan();
        }
      });

      readerRef.current.addEventListener('readingerror', () => {
        setError("Erreur de lecture NFC");
        stopScan();
      });

      // Timeout pour arr�ter le scan automatiquement
      if (timeout > 0) {
        timeoutRef.current = setTimeout(() => {
          setError("Timeout: aucune carte d�tect�e");
          stopScan();
        }, timeout);
      }

    } catch (error: any) {
      console.error("Erreur lors du d�marrage du scan NFC:", error);
      
      if (error.name === 'NotAllowedError') {
        setError("Permission NFC refus�e");
      } else if (error.name === 'NotSupportedError') {
        setError("NFC non support�");
      } else {
        setError("Erreur lors du d�marrage du scan");
      }
      
      setIsScanning(false);
    }
  }, [isSupported, isScanning, delivererId, enableLocation, timeout, recordScanMutation]);

  // Arr�ter le scan NFC
  const stopScan = useCallback(() => {
    if (readerRef.current) {
      try {
        readerRef.current.abort?.();
      } catch (error) {
        console.warn("Erreur lors de l'arr�t du scan:", error);
      }
      readerRef.current = null;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setIsScanning(false);
  }, []);

  // �crire des donn�es sur une carte NFC
  const writeCard = useCallback(async (cardData: {
    cardId: string;
    delivererId: string;
    metadata?: Record<string, any>;
  }) => {
    if (!isSupported) {
      throw new Error("NFC non support�");
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
        title: "Carte programm�e",
        description: "Les donn�es ont �t� �crites sur la carte NFC",
        variant: "default"
      });

      return true;
    } catch (error: any) {
      console.error("Erreur lors de l'�criture NFC:", error);
      
      if (error.name === 'NotAllowedError') {
        throw new Error("Permission NFC refus�e");
      } else if (error.name === 'NotSupportedError') {
        throw new Error("�criture NFC non support�e");
      } else {
        throw new Error("Erreur lors de l'�criture sur la carte");
      }
    }
  }, [isSupported, toast]);

  // Cr�er une nouvelle carte NFC
  const createCard = useCallback((metadata?: Record<string, any>) => {
    createCardMutation.mutate({
      delivererId,
      metadata
    });
  }, [delivererId, createCardMutation]);

  // D�marrage automatique si demand�
  useEffect(() => {
    if (autoStart && isSupported && !isScanning) {
      startScan();
    }

    // Cleanup lors du d�montage
    return () => {
      stopScan();
    };
  }, [autoStart, isSupported, startScan, stopScan]);

  // Nettoyer les timeouts lors du d�montage
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    // �tat
    isScanning,
    isSupported,
    error,
    lastScan,
    
    // Donn�es
    nfcCards: nfcCards || [],
    isLoading: cardsLoading,
    
    // Actions
    startScan,
    stopScan,
    writeCard,
    createCard,
    
    // �tats des mutations
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
      // D�marrer le scan NFC pour cette livraison
      await startScan(deliveryId);
      
      // Le scan sera trait� automatiquement par le hook parent
      // et la validation sera d�clench�e via recordScanMutation
      
    } catch (error) {
      console.error("Erreur validation livraison NFC:", error);
      throw error;
    }
  }, [startScan]);

  useEffect(() => {
    // Si un scan r�ussi contient un deliveryId, valider automatiquement
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { toast } = useToast();

  const startQRScan = useCallback(async () => {
    try {
      setIsScanning(true);
      setError(null);

      // Demander l'acc�s � la cam�ra
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Cam�ra arri�re
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // TODO: Int�grer une biblioth�que de scan QR (jsQR, QuaggaJS, etc.)
      // Pour l'instant, on simule le processus
      
    } catch (error: any) {
      console.error("Erreur acc�s cam�ra:", error);
      setError("Impossible d'acc�der � la cam�ra");
      setIsScanning(false);
    }
  }, []);

  const stopQRScan = useCallback(() => {
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
    videoRef,
    canvasRef,
    startQRScan,
    stopQRScan,
    clearError: () => setError(null)
  };
}