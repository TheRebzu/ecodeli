'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Calendar, Star, Euro, Clock, FileText, CheckCircle, Users } from 'lucide-react'

export function ProviderDashboard() {
  const providerInfo = {
    status: 'VALIDATED',
    rating: 4.8,
    totalInterventions: 156,
    monthlyEarnings: 2450,
    services: ['Ménage', 'Jardinage', 'Bricolage']
  }

  const evaluations = [
    { id: '1', client: 'Marie D.', service: 'Ménage', rating: 5, comment: 'Service parfait, très professionnel', date: '2024-06-28' },
    { id: '2', client: 'Jean M.', service: 'Jardinage', rating: 4, comment: 'Bon travail, ponctuel', date: '2024-06-25' },
    { id: '3', client: 'Sophie L.', service: 'Bricolage', rating: 5, comment: 'Excellent artisan, recommande', date: '2024-06-22' }
  ]

  const calendar = [
    { id: '1', date: '2024-06-29', time: '09:00', client: 'Marie D.', service: 'Ménage', status: 'CONFIRMED', duration: 120 },
    { id: '2', date: '2024-06-29', time: '14:00', client: 'Pierre L.', service: 'Jardinage', status: 'CONFIRMED', duration: 180 },
    { id: '3', date: '2024-06-30', time: '10:00', client: 'Anne M.', service: 'Bricolage', status: 'PENDING', duration: 90 }
  ]

  const interventions = [
    { id: '1', client: 'Marie D.', service: 'Ménage', date: '2024-06-28', duration: 120, amount: 60, status: 'COMPLETED' },
    { id: '2', client: 'Jean M.', service: 'Jardinage', date: '2024-06-27', duration: 180, amount: 90, status: 'COMPLETED' },
    { id: '3', client: 'Sophie L.', service: 'Bricolage', date: '2024-06-26', duration: 240, amount: 120, status: 'COMPLETED' }
  ]

  const monthlyInvoice = {
    id: 'INV-2024-06',
    period: 'Juin 2024',
    totalInterventions: 18,
    totalHours: 72,
    grossAmount: 2450,
    commission: 367.5, // 15%
    netAmount: 2082.5,
    status: 'GENERATED',
    paymentDate: '2024-07-01'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Espace Prestataire</h1>
        <p className="text-muted-foreground">
          Gérez vos prestations, évaluations et calendrier
        </p>
      </div>

      {/* Métriques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Note moyenne</p>
                <p className="text-2xl font-bold">{providerInfo.rating}/5</p>
              </div>
              <Star className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Interventions total</p>
                <p className="text-2xl font-bold">{providerInfo.totalInterventions}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Gains ce mois</p>
                <p className="text-2xl font-bold">{providerInfo.monthlyEarnings}€</p>
              </div>
              <Euro className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Services offerts</p>
                <p className="text-2xl font-bold">{providerInfo.services.length}</p>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Validation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Validation du prestataire
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-green-50 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">Profil validé</h4>
            <p className="text-green-800 text-sm">
              Votre profil a été vérifié par EcoDeli. Vous pouvez recevoir des demandes de clients.
            </p>
            <div className="mt-3">
              <p className="text-sm text-green-700">Services validés: {providerInfo.services.join(', ')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Évaluations */}
      <Card>
        <CardHeader>
          <CardTitle>Suivi des évaluations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {evaluations.map((evaluation) => (
              <div key={evaluation.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium">{evaluation.client}</h4>
                    <p className="text-sm text-muted-foreground">{evaluation.service}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-4 h-4 ${i < evaluation.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} 
                      />
                    ))}
                    <span className="ml-2 text-sm font-medium">{evaluation.rating}/5</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">{evaluation.comment}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(evaluation.date).toLocaleDateString('fr-FR')}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Calendrier */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Calendrier des disponibilités
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Heure</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Durée</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calendar.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell>{new Date(appointment.date).toLocaleDateString('fr-FR')}</TableCell>
                  <TableCell>{appointment.time}</TableCell>
                  <TableCell>{appointment.client}</TableCell>
                  <TableCell>{appointment.service}</TableCell>
                  <TableCell>{appointment.duration} min</TableCell>
                  <TableCell>
                    <Badge variant={appointment.status === 'CONFIRMED' ? 'default' : 'secondary'}>
                      {appointment.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      Gérer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4">
            <Button>Définir mes disponibilités</Button>
          </div>
        </CardContent>
      </Card>

      {/* Interventions */}
      <Card>
        <CardHeader>
          <CardTitle>Gestion des interventions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Durée</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {interventions.map((intervention) => (
                <TableRow key={intervention.id}>
                  <TableCell>{intervention.client}</TableCell>
                  <TableCell>{intervention.service}</TableCell>
                  <TableCell>{new Date(intervention.date).toLocaleDateString('fr-FR')}</TableCell>
                  <TableCell>{intervention.duration} min</TableCell>
                  <TableCell>{intervention.amount}€</TableCell>
                  <TableCell>
                    <Badge className="bg-green-100 text-green-800">{intervention.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Facturation automatique */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Facturation automatique mensuelle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 bg-blue-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-3">Facture {monthlyInvoice.id}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Période:</span>
                    <span className="font-medium">{monthlyInvoice.period}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Interventions:</span>
                    <span>{monthlyInvoice.totalInterventions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Heures totales:</span>
                    <span>{monthlyInvoice.totalHours}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Montant brut:</span>
                    <span>{monthlyInvoice.grossAmount}€</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Commission EcoDeli (15%):</span>
                    <span>-{monthlyInvoice.commission}€</span>
                  </div>
                  <div className="flex justify-between font-medium text-green-600">
                    <span>Montant net:</span>
                    <span>{monthlyInvoice.netAmount}€</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-3">Virement bancaire</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Statut:</span>
                    <Badge className="bg-green-100 text-green-800">{monthlyInvoice.status}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Date de paiement:</span>
                    <span>{new Date(monthlyInvoice.paymentDate).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Button variant="outline" className="w-full">
                    Télécharger la facture PDF
                  </Button>
                  <Button variant="outline" className="w-full">
                    Historique des factures
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}