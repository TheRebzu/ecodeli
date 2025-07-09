'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Ban, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  User,
  Calendar,
  MessageSquare
} from 'lucide-react'

interface Sanction {
  id: string
  userId: string
  userName: string
  userEmail: string
  type: 'WARNING' | 'SUSPENSION' | 'BAN'
  reason: string
  description: string
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED'
  issuedBy: string
  issuedAt: string
  expiresAt?: string
  revokedAt?: string
  revokedBy?: string
}

export function SanctionManager() {
  const [sanctions, setSanctions] = useState<Sanction[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedUser, setSelectedUser] = useState('')
  const [sanctionType, setSanctionType] = useState('')
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('')

  useEffect(() => {
    // TODO: Fetch sanctions
    setSanctions([
      {
        id: '1',
        userId: 'user123',
        userName: 'Jean Dupont',
        userEmail: 'jean.dupont@email.com',
        type: 'SUSPENSION',
        reason: 'Contenu inapproprié',
        description: 'Annonces avec contenu non conforme',
        status: 'ACTIVE',
        issuedBy: 'admin@ecodeli.com',
        issuedAt: '2024-01-10T10:30:00Z',
        expiresAt: '2024-02-10T10:30:00Z'
      },
      {
        id: '2',
        userId: 'user456',
        userName: 'Marie Martin',
        userEmail: 'marie.martin@email.com',
        type: 'WARNING',
        reason: 'Comportement suspect',
        description: 'Multiples signalements d\'utilisateurs',
        status: 'ACTIVE',
        issuedBy: 'admin@ecodeli.com',
        issuedAt: '2024-01-12T14:20:00Z'
      },
      {
        id: '3',
        userId: 'user789',
        userName: 'Pierre Durand',
        userEmail: 'pierre.durand@email.com',
        type: 'BAN',
        reason: 'Violation grave',
        description: 'Fraude avérée',
        status: 'ACTIVE',
        issuedBy: 'admin@ecodeli.com',
        issuedAt: '2024-01-05T09:15:00Z'
      }
    ])
    setLoading(false)
  }, [])

  const getSanctionBadge = (type: string) => {
    switch (type) {
      case 'WARNING':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="h-3 w-3 mr-1" />Avertissement</Badge>
      case 'SUSPENSION':
        return <Badge className="bg-orange-100 text-orange-800"><Clock className="h-3 w-3 mr-1" />Suspension</Badge>
      case 'BAN':
        return <Badge className="bg-red-100 text-red-800"><Ban className="h-3 w-3 mr-1" />Bannissement</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-red-100 text-red-800">Actif</Badge>
      case 'EXPIRED':
        return <Badge className="bg-gray-100 text-gray-800">Expiré</Badge>
      case 'REVOKED':
        return <Badge className="bg-green-100 text-green-800">Révoqué</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleIssueSanction = async () => {
    if (!selectedUser || !sanctionType || !reason) return

    try {
      // TODO: API call to issue sanction
      console.log('Issuing sanction:', {
        userId: selectedUser,
        type: sanctionType,
        reason,
        description,
        duration
      })

      // Reset form
      setSelectedUser('')
      setSanctionType('')
      setReason('')
      setDescription('')
      setDuration('')
      setShowForm(false)
    } catch (error) {
      console.error('Error issuing sanction:', error)
    }
  }

  const handleRevokeSanction = async (sanctionId: string) => {
    try {
      // TODO: API call to revoke sanction
      console.log('Revoking sanction:', sanctionId)
      
      setSanctions(prevSanctions =>
        prevSanctions.map(sanction =>
          sanction.id === sanctionId
            ? { ...sanction, status: 'REVOKED', revokedAt: new Date().toISOString() }
            : sanction
        )
      )
    } catch (error) {
      console.error('Error revoking sanction:', error)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Chargement...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Issue New Sanction */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5" />
            Nouvelle sanction
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!showForm ? (
            <Button onClick={() => setShowForm(true)}>
              <Ban className="h-4 w-4 mr-2" />
              Émettre une sanction
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="user">Utilisateur</Label>
                  <Input
                    id="user"
                    placeholder="ID utilisateur ou email"
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type de sanction</Label>
                  <Select value={sanctionType} onValueChange={setSanctionType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WARNING">Avertissement</SelectItem>
                      <SelectItem value="SUSPENSION">Suspension</SelectItem>
                      <SelectItem value="BAN">Bannissement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="reason">Raison</Label>
                <Input
                  id="reason"
                  placeholder="Raison de la sanction"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Description détaillée"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              
              {sanctionType === 'SUSPENSION' && (
                <div>
                  <Label htmlFor="duration">Durée (jours)</Label>
                  <Input
                    id="duration"
                    type="number"
                    placeholder="30"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                </div>
              )}
              
              <div className="flex gap-2">
                <Button onClick={handleIssueSanction}>
                  <Ban className="h-4 w-4 mr-2" />
                  Émettre la sanction
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sanctions List */}
      <Card>
        <CardHeader>
          <CardTitle>Sanctions actives ({sanctions.filter(s => s.status === 'ACTIVE').length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Raison</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Émise par</TableHead>
                <TableHead>Date d'émission</TableHead>
                <TableHead>Expiration</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sanctions.map((sanction) => (
                <TableRow key={sanction.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{sanction.userName}</p>
                      <p className="text-sm text-muted-foreground">{sanction.userEmail}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getSanctionBadge(sanction.type)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{sanction.reason}</p>
                      <p className="text-sm text-muted-foreground">{sanction.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(sanction.status)}
                  </TableCell>
                  <TableCell className="text-sm">{sanction.issuedBy}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(sanction.issuedAt).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell className="text-sm">
                    {sanction.expiresAt 
                      ? new Date(sanction.expiresAt).toLocaleDateString('fr-FR')
                      : sanction.type === 'BAN' ? 'Permanent' : 'N/A'
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {sanction.status === 'ACTIVE' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRevokeSanction(sanction.id)}
                        >
                          <CheckCircle className="h-3 w-3" />
                        </Button>
                      )}
                      <Button size="sm" variant="outline">
                        <MessageSquare className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
} 