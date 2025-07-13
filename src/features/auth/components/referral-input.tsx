"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReferralInputProps {
  onReferralCodeChange: (code: string | null, isValid: boolean) => void;
  defaultValue?: string;
}

interface ReferralCodeInfo {
  isValid: boolean;
  referrerName?: string;
  bonusAmount?: number;
  isExpired?: boolean;
  isMaxUsage?: boolean;
}

export default function ReferralInput({
  onReferralCodeChange,
  defaultValue,
}: ReferralInputProps) {
  const [referralCode, setReferralCode] = useState(defaultValue || "");
  const [codeInfo, setCodeInfo] = useState<ReferralCodeInfo | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showInput, setShowInput] = useState(!!defaultValue);

  useEffect(() => {
    if (referralCode && referralCode.length >= 4) {
      validateReferralCode(referralCode);
    } else {
      setCodeInfo(null);
      onReferralCodeChange(null, false);
    }
  }, [referralCode]);

  const validateReferralCode = async (code: string) => {
    if (isValidating) return;

    setIsValidating(true);
    try {
      const response = await fetch(
        `/api/referral/codes/validate?code=${encodeURIComponent(code)}`,
      );
      const data = await response.json();

      if (response.ok && data.valid) {
        const info: ReferralCodeInfo = {
          isValid: true,
          referrerName: data.referrerName,
          bonusAmount: data.bonusAmount,
          isExpired: data.isExpired,
          isMaxUsage: data.isMaxUsage,
        };
        setCodeInfo(info);
        onReferralCodeChange(code, true);
      } else {
        setCodeInfo({
          isValid: false,
          isExpired: data.isExpired,
          isMaxUsage: data.isMaxUsage,
        });
        onReferralCodeChange(null, false);
      }
    } catch (error) {
      console.error("Erreur validation code parrainage:", error);
      setCodeInfo({ isValid: false });
      onReferralCodeChange(null, false);
    } finally {
      setIsValidating(false);
    }
  };

  const clearReferralCode = () => {
    setReferralCode("");
    setCodeInfo(null);
    setShowInput(false);
    onReferralCodeChange(null, false);
  };

  if (!showInput) {
    return (
      <Card className="border-dashed border-2 border-gray-300">
        <CardContent className="p-4">
          <div className="text-center">
            <Gift className="w-8 h-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 mb-3">
              Vous avez un code de parrainage ?
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInput(true)}
              className="text-green-600 border-green-200 hover:bg-green-50"
            >
              Ajouter un code de parrainage
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="referralCode" className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-green-600" />
            Code de parrainage (optionnel)
          </Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearReferralCode}
            className="text-gray-500 hover:text-gray-700 h-auto p-1"
          >
            ✕
          </Button>
        </div>

        <div className="relative">
          <Input
            id="referralCode"
            type="text"
            placeholder="Entrez votre code de parrainage"
            value={referralCode}
            onChange={(e) =>
              setReferralCode(e.target.value.trim().toUpperCase())
            }
            className={`${
              codeInfo?.isValid
                ? "border-green-500 focus:border-green-500"
                : codeInfo?.isValid === false
                  ? "border-red-500 focus:border-red-500"
                  : "border-gray-300"
            }`}
            disabled={isValidating}
          />

          {isValidating && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-green-600"></div>
            </div>
          )}

          {codeInfo?.isValid && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Check className="h-4 w-4 text-green-600" />
            </div>
          )}

          {codeInfo?.isValid === false && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <AlertCircle className="h-4 w-4 text-red-500" />
            </div>
          )}
        </div>
      </div>

      {/* Affichage des informations du code */}
      {codeInfo && (
        <Card
          className={`${
            codeInfo.isValid
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          <CardContent className="p-3">
            {codeInfo.isValid ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    Code de parrainage valide !
                  </span>
                </div>

                {codeInfo.referrerName && (
                  <p className="text-sm text-green-700">
                    Vous avez été parrainé par{" "}
                    <strong>{codeInfo.referrerName}</strong>
                  </p>
                )}

                {codeInfo.bonusAmount && (
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-800"
                    >
                      Bonus : {codeInfo.bonusAmount}€
                    </Badge>
                  </div>
                )}

                <p className="text-xs text-green-600">
                  🎉 Votre bonus de bienvenue sera crédité après votre
                  inscription !
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-800">
                    Code de parrainage invalide
                  </span>
                </div>

                <p className="text-sm text-red-700">
                  {codeInfo.isExpired
                    ? "Ce code de parrainage a expiré."
                    : codeInfo.isMaxUsage
                      ? "Ce code de parrainage a atteint sa limite d'utilisation."
                      : "Vérifiez que vous avez saisi le bon code."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Informations sur le programme de parrainage */}
      {!codeInfo && referralCode.length === 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <Gift className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-xs text-blue-700">
                <p className="font-medium mb-1">
                  Programme de parrainage EcoDeli
                </p>
                <p>
                  Recevez un bonus de bienvenue en utilisant le code de
                  parrainage d'un ami. Vous pourrez ensuite parrainer vos
                  propres amis et gagner des récompenses !
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
