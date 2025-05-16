'use client';

import React, { useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard, Wallet, Building, Plus } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

export type PaymentMethodType = 'card' | 'wallet' | 'sepa' | 'saved_card';

export interface SavedCard {
  id: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
}

export interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethodType;
  onSelect: (method: PaymentMethodType, cardId?: string) => void;
  savedCards?: SavedCard[];
  walletBalance?: number;
  currency?: string;
  showAddCard?: boolean;
  onAddCard?: () => void;
  disabled?: boolean;
  className?: string;
}

export function PaymentMethodSelector({
  selectedMethod,
  onSelect,
  savedCards = [],
  walletBalance,
  currency = 'EUR',
  showAddCard = true,
  onAddCard,
  disabled = false,
  className,
}: PaymentMethodSelectorProps) {
  const t = useTranslations('payment');
  const [selectedCardId, setSelectedCardId] = useState<string | undefined>(
    selectedMethod === 'saved_card' && savedCards.length > 0 ? savedCards[0].id : undefined
  );

  const handleSelect = (value: string) => {
    if (value === 'saved_card' && savedCards.length > 0) {
      const cardId = selectedCardId || savedCards[0].id;
      setSelectedCardId(cardId);
      onSelect('saved_card', cardId);
    } else {
      setSelectedCardId(undefined);
      onSelect(value as PaymentMethodType);
    }
  };

  const handleCardSelect = (cardId: string) => {
    setSelectedCardId(cardId);
    onSelect('saved_card', cardId);
  };

  // Formater le solde du portefeuille
  const formatWalletBalance = (balance: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(balance);
  };

  // Obtenir le logo de la marque de carte
  const getCardBrandLogo = (brand: string) => {
    switch (brand.toLowerCase()) {
      case 'visa':
        return '/images/payment/visa.svg';
      case 'mastercard':
        return '/images/payment/mastercard.svg';
      case 'amex':
        return '/images/payment/amex.svg';
      default:
        return null;
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <RadioGroup
        value={selectedMethod}
        onValueChange={handleSelect}
        className="grid gap-4"
        disabled={disabled}
      >
        {/* Nouvelle carte */}
        <div>
          <RadioGroupItem value="card" id="card" className="peer sr-only" disabled={disabled} />
          <Label
            htmlFor="card"
            className={cn(
              'flex flex-col items-center justify-between rounded-md border-2 border-muted bg-white p-4 hover:bg-gray-50 hover:border-gray-300 transition-all',
              selectedMethod === 'card' ? 'border-primary' : '',
              'cursor-pointer'
            )}
          >
            <div className="flex w-full items-center space-x-3">
              <CreditCard className="h-5 w-5 text-primary" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">{t('newCard')}</p>
                <p className="text-xs text-muted-foreground">{t('securePayment')}</p>
              </div>
            </div>
          </Label>
        </div>

        {/* Cartes enregistrées */}
        {savedCards.length > 0 && (
          <div>
            <RadioGroupItem
              value="saved_card"
              id="saved_card"
              className="peer sr-only"
              disabled={disabled}
            />
            <Label
              htmlFor="saved_card"
              className={cn(
                'flex flex-col items-center justify-between rounded-md border-2 border-muted bg-white p-4 hover:bg-gray-50 hover:border-gray-300 transition-all',
                selectedMethod === 'saved_card' ? 'border-primary' : '',
                'cursor-pointer'
              )}
            >
              <div className="flex w-full items-center space-x-3">
                <CreditCard className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium leading-none">{t('savedCards')}</p>
                  <p className="text-xs text-muted-foreground">{t('chooseFromSavedCards')}</p>
                </div>
              </div>

              {selectedMethod === 'saved_card' && (
                <div className="w-full mt-4 grid gap-2">
                  {savedCards.map(card => (
                    <Card
                      key={card.id}
                      className={cn(
                        'cursor-pointer border hover:border-primary transition-all',
                        selectedCardId === card.id ? 'border-primary bg-primary/5' : ''
                      )}
                      onClick={() => handleCardSelect(card.id)}
                    >
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getCardBrandLogo(card.brand) ? (
                            <div className="w-8 h-8 relative">
                              <Image
                                src={getCardBrandLogo(card.brand) as string}
                                alt={card.brand}
                                fill
                                style={{ objectFit: 'contain' }}
                              />
                            </div>
                          ) : (
                            <CreditCard className="h-5 w-5" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{card.brand}</p>
                            <p className="text-xs text-muted-foreground">•••• {card.last4}</p>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {card.expiryMonth.toString().padStart(2, '0')}/
                          {card.expiryYear.toString().slice(-2)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </Label>
          </div>
        )}

        {/* Portefeuille */}
        {walletBalance !== undefined && (
          <div>
            <RadioGroupItem
              value="wallet"
              id="wallet"
              className="peer sr-only"
              disabled={disabled || walletBalance <= 0}
            />
            <Label
              htmlFor="wallet"
              className={cn(
                'flex flex-col items-center justify-between rounded-md border-2 border-muted bg-white p-4 hover:bg-gray-50 hover:border-gray-300 transition-all',
                selectedMethod === 'wallet' ? 'border-primary' : '',
                walletBalance <= 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              )}
            >
              <div className="flex w-full items-center space-x-3">
                <Wallet className="h-5 w-5 text-primary" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">{t('wallet')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('balance')}: {formatWalletBalance(walletBalance)}
                  </p>
                </div>
              </div>
            </Label>
          </div>
        )}

        {/* SEPA */}
        <div>
          <RadioGroupItem value="sepa" id="sepa" className="peer sr-only" disabled={disabled} />
          <Label
            htmlFor="sepa"
            className={cn(
              'flex flex-col items-center justify-between rounded-md border-2 border-muted bg-white p-4 hover:bg-gray-50 hover:border-gray-300 transition-all',
              selectedMethod === 'sepa' ? 'border-primary' : '',
              'cursor-pointer'
            )}
          >
            <div className="flex w-full items-center space-x-3">
              <Building className="h-5 w-5 text-primary" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">{t('sepaTransfer')}</p>
                <p className="text-xs text-muted-foreground">{t('sepaDescription')}</p>
              </div>
            </div>
          </Label>
        </div>
      </RadioGroup>

      {/* Ajouter une carte */}
      {showAddCard && onAddCard && selectedMethod === 'saved_card' && (
        <button
          type="button"
          onClick={onAddCard}
          className="flex items-center text-sm text-primary mt-2 hover:underline"
          disabled={disabled}
        >
          <Plus className="h-4 w-4 mr-1" />
          {t('addNewCard')}
        </button>
      )}
    </div>
  );
}
