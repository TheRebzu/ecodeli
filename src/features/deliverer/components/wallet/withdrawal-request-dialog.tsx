'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Euro, 
  CreditCard, 
  AlertCircle, 
  Info,
  Calculator,
  Download
} from 'lucide-react'
import { useWithdrawals } from '../../hooks/useDelivererData'
import { withdrawalSchema, type WithdrawalInput } from '../../schemas'
import { useTranslations } from 'next-intl'

interface WithdrawalRequestDialogProps {
  isOpen: boolean
  onClose: () => void
  availableBalance: number
  onSuccess: () => void
}

export function WithdrawalRequestDialog({ 
  isOpen, 
  onClose, 
  availableBalance,
  onSuccess 
}: WithdrawalRequestDialogProps) {
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const { requestWithdrawal } = useWithdrawals()
  const t = useTranslations('deliverer.wallet.withdrawal')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm<WithdrawalInput>({
    resolver: zodResolver(withdrawalSchema)
  })

  const amountValue = watch('amount', 0)
  const ibanValue = watch('bankAccount', '')

  // Calcul des frais (2% minimum 1€)
  const calculateFee = (amount: number) => {
    const percentageFee = amount * 0.02
    return Math.max(percentageFee, 1)
  }

  const fee = calculateFee(amountValue || 0)
  const netAmount = (amountValue || 0) - fee

  const onSubmit = async (data: WithdrawalInput) => {
    setProcessing(true)
    setError('')

    try {
      await requestWithdrawal(data)
      onSuccess()
      handleClose()
    } catch (error: any) {
      setError(error.message || t('error.request_failed'))
    } finally {
      setProcessing(false)
    }
  }

  const handleClose = () => {
    reset()
    setError('')
    onClose()
  }

  const setPresetAmount = (percentage: number) => {
    const amount = Math.floor(availableBalance * percentage)
    setValue('amount', amount)
  }

  const formatIBAN = (iban: string) => {
    // Formate l'IBAN pour l'affichage (espaces tous les 4 caractères)
    return iban.replace(/(.{4})/g, '$1 ').trim()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Download className="w-5 h-5 mr-2 text-blue-600" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Solde disponible */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">{t('available_balance')}</span>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {availableBalance.toFixed(2)}€
              </Badge>
            </div>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Montant à retirer */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="flex items-center">
                <Euro className="w-4 h-4 mr-2" />
                {t('amount_label')}
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="10"
                max={availableBalance}
                placeholder="50.00"
                {...register('amount', { valueAsNumber: true })}
              />
              
              {/* Boutons de montant prédéfinis */}
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPresetAmount(0.25)}
                >
                  25%
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPresetAmount(0.5)}
                >
                  50%
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPresetAmount(0.75)}
                >
                  75%
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPresetAmount(1)}
                >
                  {t('all')}
                </Button>
              </div>

              {errors.amount && (
                <p className="text-sm text-red-600">{errors.amount.message}</p>
              )}
            </div>

            {/* IBAN */}
            <div className="space-y-2">
              <Label htmlFor="bankAccount" className="flex items-center">
                <CreditCard className="w-4 h-4 mr-2" />
                {t('iban_label')}
              </Label>
              <Input
                id="bankAccount"
                placeholder="FR76 1234 5678 9012 3456 7890 123"
                {...register('bankAccount')}
                onChange={(e) => {
                  // Formater l'IBAN en temps réel
                  const value = e.target.value.replace(/\s/g, '').toUpperCase()
                  e.target.value = formatIBAN(value)
                }}
              />
              {errors.bankAccount && (
                <p className="text-sm text-red-600">{errors.bankAccount.message}</p>
              )}
            </div>

            {/* Calcul des frais */}
            {amountValue && amountValue >= 10 && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <Calculator className="w-4 h-4 mr-2" />
                  {t('fee_calculation')}
                </div>
                
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>{t('requested_amount')}</span>
                    <span>{amountValue.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-orange-600">
                    <span>{t('processing_fee')}</span>
                    <span>-{fee.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between font-semibold text-green-600 border-t pt-1">
                    <span>{t('net_amount')}</span>
                    <span>{netAmount.toFixed(2)}€</span>
                  </div>
                </div>
              </div>
            )}

            {/* Erreur */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Informations */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="space-y-1">
                <p>{t('info.fee_structure')}</p>
                <p>{t('info.processing_time')}</p>
                <p>{t('info.minimum_amount')}</p>
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={processing}
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                disabled={!amountValue || amountValue < 10 || !ibanValue || processing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {processing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {t('processing')}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    {t('request')} {netAmount.toFixed(2)}€
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
} 

export default WithdrawalRequestDialog 