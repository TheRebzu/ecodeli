"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CreditCard, Wallet, Building2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface SavedCard {
  id: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
}

interface PaymentMethodSelectorProps {
  selectedMethod: "card" | "wallet" | "sepa" | "saved_card";
  onSelect: (method: "card" | "wallet" | "sepa" | "saved_card", cardId?: string) => void;
  savedCards?: SavedCard[];
  walletBalance?: number;
  disabled?: boolean;
}

export function PaymentMethodSelector({
  selectedMethod,
  onSelect,
  savedCards = [],
  walletBalance = 0,
  disabled = false,
}: PaymentMethodSelectorProps) {
  const t = useTranslations("payment");

  return (
    <div className="space-y-3">
      <RadioGroup
        value={selectedMethod}
        onValueChange={(value) => onSelect(value as typeof selectedMethod)}
        className="gap-3"
        disabled={disabled}
      >
        {/* Nouvelle carte de crédit */}
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="card" id="card" />
          <Label
            htmlFor="card"
            className="flex items-center gap-2 cursor-pointer flex-1 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
          >
            <CreditCard className="h-4 w-4 text-blue-600" />
            <span>{t("newCreditCard")}</span>
          </Label>
        </div>

        {/* Cartes sauvegardées */}
        {savedCards.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="saved_card" id="saved_card" />
              <Label htmlFor="saved_card" className="text-sm font-medium">
                {t("savedCards")}
              </Label>
            </div>
            {selectedMethod === "saved_card" && (
              <div className="ml-6 space-y-2">
                {savedCards.map((card) => (
                  <Card
                    key={card.id}
                    className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => onSelect("saved_card", card.id)}
                  >
                    <CardContent className="p-0 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        <span className="text-sm">
                          **** **** **** {card.last4}
                        </span>
                        <span className="text-xs text-gray-500 uppercase">
                          {card.brand}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {card.expiryMonth.toString().padStart(2, "0")}/
                        {card.expiryYear.toString().slice(-2)}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Portefeuille EcoDeli */}
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="wallet" id="wallet" />
          <Label
            htmlFor="wallet"
            className="flex items-center justify-between cursor-pointer flex-1 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-green-600" />
              <span>{t("ecoDeliWallet")}</span>
            </div>
            <span className="text-sm font-medium text-green-600">
              {formatCurrency(walletBalance, "EUR")}
            </span>
          </Label>
        </div>

        {/* Virement SEPA */}
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="sepa" id="sepa" />
          <Label
            htmlFor="sepa"
            className="flex items-center gap-2 cursor-pointer flex-1 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
          >
            <Building2 className="h-4 w-4 text-gray-600" />
            <span>{t("sepaTransfer")}</span>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
