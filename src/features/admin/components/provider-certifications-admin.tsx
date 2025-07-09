'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle, X, Clock, Eye, AlertCircle, Award } from 'lucide-react'
import { useApi } from '@/hooks/use-api'
import { toast } from 'sonner'

interface ProviderCertification {
  id: string
  name: string
  issuingOrganization: string
  issueDate: string
  expiryDate?: string
  certificateNumber: string
  documentUrl?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  validatedBy?: string
  validatedAt?: string
  notes?: string
  provider: {
    id: string
    businessName?: string
    user: {
      email: string
      profile?: {
        firstName?: string
        lastName?: string
      }
    }
  }
}

interface ProviderCertificationsAdminProps {
  providerId?: string
}

export function ProviderCertificationsAdmin({ providerId }: ProviderCertificationsAdminProps) {
  const { execute } = useApi()
  const [certifications, setCertifications] = useState<ProviderCertification[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCertification, setSelectedCertification] = useState<ProviderCertification | null>(null)
  const [showValidationDialog, setShowValidationDialog] = useState(false)
  const [validationStatus, setValidationStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED')
  const [validationNotes, setValidationNotes] = useState('')

  const fetchCertifications = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (providerId) {
        params.append('providerId', providerId)
      }
      
      const response = await execute(`/api/admin/provider-certifications?${params.toString()}`)
      if (response) {
        setCertifications(response.certifications || [])
      }
    } catch (error) {
      console.error('Error fetching certifications:', error)
      toast.error('Erreur lors du chargement des certifications')
    } finally {
      setLoading(false)
    }
  }

  const validateCertification = async () => {
    if (!selectedCertification) return

    try {
      const response = await execute('/api/admin/provider-certifications', {
        method: 'POST',
        body: JSON.stringify({
          certificationId: selectedCertification.id,
          status: validationStatus,
          notes: validationNotes
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      if (response) {
        toast.success('Certification mise à jour avec succès')
        setShowValidationDialog(false)
        setSelectedCertification(null)
        setValidationNotes('')
        fetchCertifications()
      }
    } catch (error) {
      console.error('Error validating certification:', error)
      toast.error('Erreur lors de la validation')
    }
  }

  const getStatusBadge = (status: string) => {
    const config = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'En attente' },
      APPROVED: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Approuvée' },
      REJECTED: { color: 'bg-red-100 text-red-800', icon: X, label: 'Rejetée' }
    }

    const statusConfig = config[status as keyof typeof config] || config.PENDING
    const Icon = statusConfig.icon

    return (
      <Badge className={statusConfig.color}>
        <Icon className="w-3 h-3 mr-1" />
        {statusConfig.label}
      </Badge>
    )
  }

  const openValidationDialog = (certification: ProviderCertification) => {
    setSelectedCertification(certification)
    setValidationStatus(certification.status === 'APPROVED' ? 'APPROVED' : 'REJECTED')
    setValidationNotes(certification.notes || '')
    setShowValidationDialog(true)
  }

  useEffect(() => {
    fetchCertifications()
  }, [providerId])

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Award className="w-5 h-5" />
          Validation des Certifications Prestataires
        </h3>
        <p className="text-gray-600">
          Validation des habilitations et certifications des prestataires
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Certifications en attente</CardTitle>
          <CardDescription>
            {certifications.length} certification(s) trouvée(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {certifications.length === 0 ? (
            <div className="text-center py-8">
              <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Aucune certification en attente</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prestataire</TableHead>
                  <TableHead>Certification</TableHead>
                  <TableHead>Organisme</TableHead>
                  <TableHead>Date d'émission</TableHead>
                  <TableHead>Expiration</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certifications.map((certification) => (
                  <TableRow key={certification.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {certification.provider.businessName || 
                           `${certification.provider.user.profile?.firstName || ''} ${certification.provider.user.profile?.lastName || ''}`.trim() ||
                           certification.provider.user.email}
                        </div>
                        <div className="text-sm text-gray-500">
                          {certification.provider.user.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{certification.name}</div>
                      {certification.certificateNumber && (
                        <div className="text-sm text-gray-500">
                          N° {certification.certificateNumber}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{certification.issuingOrganization}</TableCell>
                    <TableCell>
                      {new Date(certification.issueDate).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      {certification.expiryDate ? 
                        new Date(certification.expiryDate).toLocaleDateString('fr-FR') :
                        'Non définie'
                      }
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(certification.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {certification.documentUrl && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={certification.documentUrl} target="_blank">
                              <Eye className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                        
                        {certification.status === 'PENDING' && (
                          <Button 
                            size="sm"
                            onClick={() => openValidationDialog(certification)}
                          >
                            Valider
                          </Button>
                        )}
                        
                        {certification.status !== 'PENDING' && (
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => openValidationDialog(certification)}
                          >
                            Modifier
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedCertification ? `Validation: ${selectedCertification.name}` : 'Validation'}
            </DialogTitle>
            <DialogDescription>
              Valider ou rejeter cette certification
            </DialogDescription>
          </DialogHeader>
          
          {selectedCertification && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Prestataire</Label>
                  <p className="text-sm text-gray-600">
                    {selectedCertification.provider.businessName || 
                     `${selectedCertification.provider.user.profile?.firstName || ''} ${selectedCertification.provider.user.profile?.lastName || ''}`.trim() ||
                     selectedCertification.provider.user.email}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Organisme</Label>
                  <p className="text-sm text-gray-600">
                    {selectedCertification.issuingOrganization}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Date d'émission</Label>
                  <p className="text-sm text-gray-600">
                    {new Date(selectedCertification.issueDate).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Expiration</Label>
                  <p className="text-sm text-gray-600">
                    {selectedCertification.expiryDate ? 
                      new Date(selectedCertification.expiryDate).toLocaleDateString('fr-FR') :
                      'Non définie'
                    }
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="validationStatus">Statut</Label>
                <Select
                  value={validationStatus}
                  onValueChange={(value) => setValidationStatus(value as 'APPROVED' | 'REJECTED')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="APPROVED">Approuvée</SelectItem>
                    <SelectItem value="REJECTED">Rejetée</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="validationNotes">Notes (optionnel)</Label>
                <Textarea
                  id="validationNotes"
                  value={validationNotes}
                  onChange={(e) => setValidationNotes(e.target.value)}
                  placeholder="Raison de la validation ou du rejet..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowValidationDialog(false)}>
              Annuler
            </Button>
            <Button onClick={validateCertification}>
              {validationStatus === 'APPROVED' ? 'Approuver' : 'Rejeter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 