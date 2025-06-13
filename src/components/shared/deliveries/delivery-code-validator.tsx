"use client";

import { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  QrCode,
  Camera,
  Upload,
  MapPin,
  Navigation,
  User,
  Phone,
  Smartphone,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileImage,
  Trash2,
  RotateCcw,
  Zap,
  Clock,
  Shield,
  Edit3,
  MessageCircle,
  FileText,
  Package,
  Signature,
  CreditCard,
  ScanLine,
  Loader2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { cn } from "@/lib/utils/common";

export interface ValidationPhoto {
  id: string;
  type:
    | "package"
    | "signature"
    | "delivery_location"
    | "id_document"
    | "damage";
  file: File;
  preview: string;
  timestamp: Date;
  required: boolean;
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
  onValidateCode: (
    code: string,
    photos: ValidationPhoto[],
    location?: GeolocationPosition,
    signature?: string,
    notes?: string,
  ) => Promise<boolean>;
  onContactClient: () => void;
  isValidating?: boolean;
  className?: string;
}

interface ValidationStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
}

export default function DeliveryCodeValidator({
  deliveryInfo,
  onValidateCode,
  onContactClient,
  isValidating = false,
  className,
}: DeliveryCodeValidatorProps) {
  const t = useTranslations("delivery.validation");

  // États principaux
  const [currentStep, setCurrentStep] = useState(0);
  const [code, setCode] = useState("");
  const [photos, setPhotos] = useState<ValidationPhoto[]>([]);
  const [signature, setSignature] = useState("");
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // États de validation
  const [codeMethod, setCodeMethod] = useState<"manual" | "qr" | "nfc">(
    "manual",
  );
  const [isScanning, setIsScanning] = useState(false);
  const [validationProgress, setValidationProgress] = useState(0);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signaturePadRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Définir les étapes de validation
  const steps: ValidationStep[] = [
    {
      id: "location",
      title: "Localisation",
      description: "Confirmer votre position",
      completed: !!location,
      required: true,
    },
    {
      id: "code",
      title: "Code",
      description: "Scanner ou saisir le code",
      completed: code.length >= 3,
      required: true,
    },
    {
      id: "photos",
      title: "Photos",
      description: "Prendre les photos requises",
      completed: photos.some((p) => p.type === "package"),
      required: true,
    },
    {
      id: "signature",
      title: "Signature",
      description: "Signature du destinataire",
      completed: !deliveryInfo.requiresSignature || signature.length > 0,
      required: deliveryInfo.requiresSignature,
    },
    {
      id: "confirmation",
      title: "Confirmation",
      description: "Valider la livraison",
      completed: false,
      required: true,
    },
  ];

  // Obtenir la géolocalisation
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("Géolocalisation non supportée");
      return;
    }

    setIsGettingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000,
          });
        },
      );

      setLocation(position);
      toast.success("Position obtenue");
    } catch (error) {
      console.error("Erreur de géolocalisation:", error);
      toast.error("Erreur lors de l'obtention de la position");
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Scanner QR code (simulation)
  const startQRScan = async () => {
    setIsScanning(true);
    try {
      // Simulation d'un scan QR
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Code simulé
      const scannedCode = "ABC123";
      setCode(scannedCode);
      setCodeMethod("qr");
      toast.success("QR Code scanné");
    } catch (error) {
      toast.error("Erreur lors du scan QR");
    } finally {
      setIsScanning(false);
    }
  };

  // Scanner NFC (simulation)
  const scanNFC = async () => {
    if (!("NDEFReader" in window)) {
      toast.error("NFC non supporté");
      return;
    }

    try {
      // Simulation NFC
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const nfcCode = "ABC123";
      setCode(nfcCode);
      setCodeMethod("nfc");
      toast.success("Code NFC lu");
    } catch (error) {
      toast.error("Erreur NFC");
    }
  };

  // Gérer l'upload de photos
  const handlePhotoUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    type: ValidationPhoto["type"],
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Type de fichier invalide");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        // 10MB max
        toast.error("Fichier trop volumineux");
        return;
      }

      const id =
        Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const preview = URL.createObjectURL(file);

      const photo: ValidationPhoto = {
        id,
        type,
        file,
        preview,
        timestamp: new Date(),
        required:
          type === "package" ||
          (type === "signature" && deliveryInfo.requiresSignature),
      };

      setPhotos((prev) => [...prev, photo]);
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Supprimer une photo
  const removePhoto = (photoId: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === photoId);
      if (photo) {
        URL.revokeObjectURL(photo.preview);
      }
      return prev.filter((p) => p.id !== photoId);
    });
  };

  // Prendre une photo avec la caméra
  const takePhoto = async (type: ValidationPhoto["type"]) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Interface de capture photo (simplified)
      toast.info("Mode capture photo activé");
    } catch (error) {
      toast.error("Erreur caméra");
    }
  };

  // Dessiner la signature
  const drawSignature = (
    event:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    const canvas = signaturePadRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let clientX, clientY;
    if ("touches" in event) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";

    if (event.type === "mousedown" || event.type === "touchstart") {
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else if (event.type === "mousemove" || event.type === "touchmove") {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  // Effacer la signature
  const clearSignature = () => {
    const canvas = signaturePadRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature("");
  };

  // Sauvegarder la signature
  const saveSignature = () => {
    const canvas = signaturePadRef.current;
    if (!canvas) return;

    const dataURL = canvas.toDataURL();
    setSignature(dataURL);
    toast.success("Signature sauvegardée");
  };

  // Calculer le progrès
  useEffect(() => {
    const completedSteps = steps.filter((step) => step.completed).length;
    const progress = (completedSteps / steps.length) * 100;
    setValidationProgress(progress);
  }, [steps]);

  // Valider la livraison
  const handleValidation = async () => {
    if (!code) {
      toast.error("Code requis");
      return;
    }

    if (!photos.some((p) => p.type === "package")) {
      toast.error("Photo du colis requise");
      return;
    }

    if (deliveryInfo.requiresSignature && !signature) {
      toast.error("Signature requise");
      return;
    }

    const success = await onValidateCode(
      code,
      photos,
      location || undefined,
      signature,
      notes,
    );

    if (success) {
      // Nettoyage des URLs d'objets
      photos.forEach((photo) => {
        URL.revokeObjectURL(photo.preview);
      });
    }
  };

  const canProceedToNextStep = (stepIndex: number) => {
    return steps[stepIndex].completed || !steps[stepIndex].required;
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1 && canProceedToNextStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Validation de livraison
            </CardTitle>
            <CardDescription>
              Suivez les étapes pour valider la livraison
            </CardDescription>
          </div>
          <Button variant="outline" onClick={onContactClient}>
            <Phone className="h-4 w-4 mr-2" />
            Contacter le client
          </Button>
        </div>

        {/* Barre de progrès */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progression</span>
            <span>{Math.round(validationProgress)}%</span>
          </div>
          <Progress value={validationProgress} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Informations de livraison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4" />
              <span className="font-medium">Client:</span>
              <span>{deliveryInfo.clientName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4" />
              <span className="font-medium">Récupération:</span>
              <span className="truncate">{deliveryInfo.pickupAddress}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Navigation className="h-4 w-4" />
              <span className="font-medium">Livraison:</span>
              <span className="truncate">{deliveryInfo.deliveryAddress}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {deliveryInfo.requiresSignature && (
                <Badge variant="outline">
                  <Signature className="h-3 w-3 mr-1" />
                  Signature requise
                </Badge>
              )}
              {deliveryInfo.requiresId && (
                <Badge variant="outline">
                  <CreditCard className="h-3 w-3 mr-1" />
                  Pièce d'identité
                </Badge>
              )}
              {deliveryInfo.isFragile && (
                <Badge variant="outline" className="text-orange-600">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Fragile
                </Badge>
              )}
            </div>

            {deliveryInfo.specialInstructions && (
              <div className="text-sm">
                <span className="font-medium">Instructions:</span>
                <p className="text-muted-foreground mt-1">
                  {deliveryInfo.specialInstructions}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Étapes de validation */}
        <Tabs value={steps[currentStep]?.id} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            {steps.map((step, index) => (
              <TabsTrigger
                key={step.id}
                value={step.id}
                className={cn(
                  "flex items-center gap-1 text-xs",
                  step.completed && "bg-green-100 text-green-700",
                  currentStep === index && "ring-2 ring-primary",
                )}
                onClick={() => setCurrentStep(index)}
                disabled={index > currentStep + 1}
              >
                {step.completed ? (
                  <CheckCircle className="h-3 w-3" />
                ) : step.required ? (
                  <div className="h-3 w-3 rounded-full border-2 border-current" />
                ) : (
                  <div className="h-3 w-3 rounded-full bg-muted" />
                )}
                <span className="hidden sm:inline">{step.title}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Étape 1: Géolocalisation */}
          <TabsContent value="location" className="space-y-4">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <MapPin className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  Confirmer votre position
                </h3>
                <p className="text-muted-foreground">
                  Votre position GPS est requise pour valider la livraison
                </p>
              </div>

              {location ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Position obtenue: {location.coords.latitude.toFixed(6)},{" "}
                    {location.coords.longitude.toFixed(6)}
                    <br />
                    Précision: ±{Math.round(location.coords.accuracy)}m
                  </AlertDescription>
                </Alert>
              ) : (
                <Button
                  onClick={getCurrentLocation}
                  disabled={isGettingLocation}
                  size="lg"
                  className="w-full max-w-sm"
                >
                  {isGettingLocation ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <MapPin className="h-4 w-4 mr-2" />
                  )}
                  {isGettingLocation
                    ? "Obtention de la position..."
                    : "Obtenir ma position"}
                </Button>
              )}
            </div>
          </TabsContent>

          {/* Étape 2: Code de validation */}
          <TabsContent value="code" className="space-y-4">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <QrCode className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Code de validation</h3>
                <p className="text-muted-foreground">
                  Scannez le QR code ou saisissez le code manuellement
                </p>
              </div>

              <Tabs
                value={codeMethod}
                onValueChange={(value) => setCodeMethod(value as any)}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="manual">
                    <Edit3 className="h-4 w-4 mr-2" />
                    Manuel
                  </TabsTrigger>
                  <TabsTrigger value="qr">
                    <QrCode className="h-4 w-4 mr-2" />
                    QR Code
                  </TabsTrigger>
                  <TabsTrigger value="nfc">
                    <Smartphone className="h-4 w-4 mr-2" />
                    NFC
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="manual" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="validation-code">Saisir le code</Label>
                    <Input
                      id="validation-code"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="Ex: ABC123"
                      className="text-center text-lg font-mono tracking-wider"
                      maxLength={10}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="qr" className="space-y-4">
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-48 h-48 bg-muted/50 rounded-lg flex items-center justify-center border-2 border-dashed">
                      <div className="text-center">
                        <ScanLine className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Zone de scan QR
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={startQRScan}
                      disabled={isScanning}
                      size="lg"
                    >
                      {isScanning ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <QrCode className="h-4 w-4 mr-2" />
                      )}
                      {isScanning ? "Scan en cours..." : "Démarrer le scan"}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="nfc" className="space-y-4">
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-32 h-32 bg-blue-50 rounded-full flex items-center justify-center">
                      <Smartphone className="h-16 w-16 text-blue-600" />
                    </div>
                    <Button onClick={scanNFC} size="lg" variant="outline">
                      <Zap className="h-4 w-4 mr-2" />
                      Scanner NFC
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Approchez votre téléphone du tag NFC
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              {code && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Code saisi: <strong>{code}</strong>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          {/* Étape 3: Photos */}
          <TabsContent value="photos" className="space-y-4">
            <div className="space-y-4">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Camera className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Photos de validation</h3>
                <p className="text-muted-foreground">
                  Prenez les photos requises pour la validation
                </p>
              </div>

              {/* Boutons de capture */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full h-20 flex-col"
                    onClick={() => takePhoto("package")}
                  >
                    <Camera className="h-6 w-6 mb-1" />
                    Prendre photo
                  </Button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handlePhotoUpload(e, "package")}
                  />
                  <Button
                    variant="outline"
                    className="w-full h-20 flex-col"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-6 w-6 mb-1" />
                    Télécharger
                  </Button>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span>Colis *</span>
                  </div>
                  {deliveryInfo.requiresSignature && (
                    <div className="flex items-center gap-2">
                      <Signature className="h-4 w-4" />
                      <span>Signature *</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>Lieu de livraison</span>
                  </div>
                </div>
              </div>

              {/* Gallery des photos */}
              {photos.length > 0 && (
                <div className="space-y-4">
                  <Separator />
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {photos.map((photo) => (
                      <div key={photo.id} className="relative group">
                        <img
                          src={photo.preview}
                          alt={`Photo ${photo.type}`}
                          className="w-full h-24 object-cover rounded-lg border"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removePhoto(photo.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Badge className="absolute top-1 left-1 text-xs">
                          {photo.type}
                        </Badge>
                        {photo.required && (
                          <Badge
                            variant="destructive"
                            className="absolute top-1 right-1 text-xs"
                          >
                            *
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Étape 4: Signature */}
          <TabsContent value="signature" className="space-y-4">
            {deliveryInfo.requiresSignature ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Signature className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">
                    Signature du destinataire
                  </h3>
                  <p className="text-muted-foreground">
                    Demandez au destinataire de signer ci-dessous
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                    <canvas
                      ref={signaturePadRef}
                      width={400}
                      height={200}
                      className="w-full h-48 border border-input rounded cursor-crosshair bg-background"
                      onMouseDown={drawSignature}
                      onMouseMove={drawSignature}
                      onTouchStart={drawSignature}
                      onTouchMove={drawSignature}
                    />
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={clearSignature}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Effacer
                    </Button>
                    <Button onClick={saveSignature}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Sauvegarder
                    </Button>
                  </div>

                  {signature && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>Signature enregistrée</AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold">Signature non requise</h3>
                <p className="text-muted-foreground">
                  Cette livraison ne nécessite pas de signature
                </p>
              </div>
            )}
          </TabsContent>

          {/* Étape 5: Confirmation */}
          <TabsContent value="confirmation" className="space-y-4">
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">
                  Confirmation de livraison
                </h3>
                <p className="text-muted-foreground">
                  Vérifiez les informations avant de valider
                </p>
              </div>

              {/* Résumé de la validation */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Récapitulatif</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>Code:</span>
                        <span className="font-mono font-bold">{code}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Photos:</span>
                        <span>{photos.length} téléchargées</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Position:</span>
                        <span>{location ? "Obtenue" : "Non obtenue"}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>Signature:</span>
                        <span>
                          {signature
                            ? "Fournie"
                            : deliveryInfo.requiresSignature
                              ? "Requise"
                              : "Non requise"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Heure:</span>
                        <span>{new Date().toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes additionnelles */}
              <div className="space-y-2">
                <Label htmlFor="delivery-notes">Notes additionnelles</Label>
                <Textarea
                  id="delivery-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Commentaires sur la livraison (optionnel)"
                  rows={3}
                />
              </div>

              {/* Bouton de validation finale */}
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Une fois validée, cette action ne peut pas être annulée. Le
                  paiement sera déclenché automatiquement.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleValidation}
                disabled={
                  isValidating ||
                  !steps
                    .slice(0, -1)
                    .every((step) => step.completed || !step.required)
                }
                size="lg"
                className="w-full"
              >
                {isValidating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                {isValidating
                  ? "Validation en cours..."
                  : "Valider la livraison"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Navigation entre les étapes */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            Précédent
          </Button>

          <Button
            onClick={nextStep}
            disabled={
              currentStep === steps.length - 1 ||
              !canProceedToNextStep(currentStep)
            }
          >
            {currentStep === steps.length - 1 ? "Valider" : "Suivant"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
