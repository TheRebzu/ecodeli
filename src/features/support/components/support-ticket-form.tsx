'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Send, AlertCircle, CheckCircle2 } from 'lucide-react'

const ticketSchema = z.object({
  title: z.string().min(3, 'Le titre doit contenir au moins 3 caractères'),
  description: z.string().min(10, 'La description doit contenir au moins 10 caractères'),
  category: z.enum([
    'DELIVERY_ISSUE',
    'PAYMENT_PROBLEM',
    'ACCOUNT_ACCESS',
    'TECHNICAL_SUPPORT',
    'BILLING_INQUIRY',
    'FEATURE_REQUEST',
    'COMPLAINT',
    'PARTNERSHIP',
    'GENERAL_INQUIRY',
    'BUG_REPORT'
  ], { required_error: 'Veuillez sélectionner une catégorie' }),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  deliveryId: z.string().optional()
})

type TicketFormData = z.infer<typeof ticketSchema>

interface SupportTicketFormProps {
  deliveryId?: string
  onSuccess?: (ticket: any) => void
  onCancel?: () => void
}

const categoryLabels = {
  DELIVERY_ISSUE: 'Problème de livraison',
  PAYMENT_PROBLEM: 'Problème de paiement',
  ACCOUNT_ACCESS: 'Accès au compte',
  TECHNICAL_SUPPORT: 'Support technique',
  BILLING_INQUIRY: 'Question de facturation',
  FEATURE_REQUEST: 'Demande de fonctionnalité',
  COMPLAINT: 'Réclamation',
  PARTNERSHIP: 'Partenariat',
  GENERAL_INQUIRY: 'Question générale',
  BUG_REPORT: 'Signalement de bug'
}

const priorityLabels = {
  LOW: 'Faible',
  MEDIUM: 'Moyenne',
  HIGH: 'Élevée',
  URGENT: 'Urgente'
}

export function SupportTicketForm({ 
  deliveryId, 
  onSuccess,
  onCancel 
}: SupportTicketFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const form = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      title: '',
      description: '',
      deliveryId: deliveryId || undefined,
      priority: 'MEDIUM'
    }
  })

  const onSubmit = async (data: TicketFormData) => {
    try {
      setIsSubmitting(true)
      setSubmitMessage(null)

      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la création du ticket')
      }

      setSubmitMessage({
        type: 'success',
        text: `Ticket #${result.ticket.ticketNumber} créé avec succès !`
      })

      form.reset()
      onSuccess?.(result.ticket)

    } catch (error) {
      console.error('Erreur lors de la création du ticket:', error)
      setSubmitMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erreur lors de la création du ticket'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Créer un ticket de support
        </CardTitle>
        <CardDescription>
          Décrivez votre problème ou votre demande. Notre équipe vous répondra dans les plus brefs délais.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {submitMessage && (
          <Alert className={`mb-6 ${submitMessage.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <div className="flex items-center gap-2">
              {submitMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={submitMessage.type === 'success' ? 'text-green-700' : 'text-red-700'}>
                {submitMessage.text}
              </AlertDescription>
            </div>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez une catégorie" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(categoryLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priorité</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez une priorité" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(priorityLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Résumé bref de votre demande..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description détaillée *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Décrivez votre problème ou votre demande en détail..."
                      className="min-h-32"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {deliveryId && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  Ce ticket sera automatiquement lié à votre livraison #{deliveryId.slice(-8)}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Annuler
                </Button>
              )}
              
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-32"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Créer le ticket
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}