'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, CreditCard, AlertCircle, CheckCircle } from 'lucide-react'

const withdrawalSchema = z.object({
  amount: z.number().min(10, 'Le montant minimum est de 10€').max(5000, 'Le montant maximum est de 5000€'),
  bankAccountId: z.string().min(1, 'Veuillez sélectionner un compte bancaire'),
  notes: z.string().optional()
})

type WithdrawalForm = z.infer<typeof withdrawalSchema>

interface BankAccount {
  id: string
  bankName: string
  accountNumber: string
  accountHolderName: string
  isDefault: boolean
}

interface WithdrawalRequestFormProps {
  availableBalance: number
  bankAccounts: BankAccount[]
  onSuccess: () => void
}

export function WithdrawalRequestForm({ 
  availableBalance, 
  bankAccounts, 
  onSuccess 
}: WithdrawalRequestFormProps) {
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<WithdrawalForm>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      amount: 0,
      bankAccountId: bankAccounts.find(acc => acc.isDefault)?.id || '',
      notes: ''
    }
  })

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(price)
  }

  const onSubmit = async (data: WithdrawalForm) => {
    try {
      setSubmitting(true)

      if (data.amount > availableBalance) {
        toast({
          title: '❌ Montant trop élevé',
          description: `Le montant demandé dépasse votre solde disponible (${formatPrice(availableBalance)})`,
          variant: 'destructive'
        })
        return
      }

      const response = await fetch('/api/deliverer/wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la demande')
      }

      const result = await response.json()

      toast({
        title: '✅ Demande de retrait créée',
        description: result.message || 'Votre demande sera traitée sous 1-3 jours ouvrés',
      })

      onSuccess()

    } catch (error) {
      console.error('Erreur demande retrait:', error)
      toast({
        title: '❌ Erreur',
        description: error instanceof Error ? error.message : 'Une erreur s\'est produite',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const watchedAmount = form.watch('amount')
  const isAmountValid = watchedAmount >= 10 && watchedAmount <= availableBalance

  if (bankAccounts.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Vous devez d'abord ajouter un compte bancaire pour pouvoir effectuer un retrait.
        </AlertDescription>
      </Alert>
    )
  }

  if (availableBalance < 10) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Votre solde disponible ({formatPrice(availableBalance)}) est insuffisant pour effectuer un retrait (minimum 10€).
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Informations du solde */}
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-800 mb-2">
            <CreditCard className="h-4 w-4" />
            <span className="font-medium">Solde disponible</span>
          </div>
          <div className="text-2xl font-bold text-green-600">
            {formatPrice(availableBalance)}
          </div>
          <p className="text-sm text-green-700 mt-1">
            Montant que vous pouvez retirer immédiatement
          </p>
        </div>

        {/* Montant */}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Montant à retirer *</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="number"
                    min="10"
                    max={availableBalance}
                    step="0.01"
                    placeholder="50.00"
                    className="pr-12"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    €
                  </span>
                </div>
              </FormControl>
              <FormDescription>
                Minimum: 10€ • Maximum: {formatPrice(Math.min(5000, availableBalance))}
              </FormDescription>
              <FormMessage />
              
              {watchedAmount > 0 && (
                <div className="mt-2">
                  {isAmountValid ? (
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <CheckCircle className="h-4 w-4" />
                      Montant valide
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      {watchedAmount < 10 
                        ? 'Montant minimum: 10€'
                        : `Montant maximum disponible: ${formatPrice(availableBalance)}`
                      }
                    </div>
                  )}
                </div>
              )}
            </FormItem>
          )}
        />

        {/* Compte bancaire */}
        <FormField
          control={form.control}
          name="bankAccountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Compte bancaire de destination *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un compte" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-2">
                        <span>{account.bankName}</span>
                        <span className="text-gray-500">{account.accountNumber}</span>
                        {account.isDefault && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Par défaut
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Le virement sera effectué vers ce compte bancaire
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (optionnel)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Commentaires ou instructions particulières..."
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Informations complémentaires pour cette demande
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Informations importantes */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">
            💡 Informations importantes
          </h4>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• Délai de traitement: 1 à 3 jours ouvrés</li>
            <li>• Aucuns frais de retrait</li>
            <li>• Le montant sera déduit immédiatement de votre solde</li>
            <li>• Vous recevrez un email de confirmation</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={() => form.reset()}>
            Annuler
          </Button>
          <Button 
            type="submit" 
            disabled={submitting || !isAmountValid}
            className="bg-green-600 hover:bg-green-700"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Traitement...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Demander le retrait
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}