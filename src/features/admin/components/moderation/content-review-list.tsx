'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  MessageSquare, 
  Star,
  Flag,
  Clock,
  Eye
} from 'lucide-react'

interface ContentReviewListProps {
  statusFilter: string
  searchTerm: string
  typeFilter: string
}

interface ContentItem {
  id: string
  type: 'ANNOUNCEMENT' | 'REVIEW' | 'COMMENT' | 'USER_REPORT'
  title: string
  content: string
  status: 'PENDING' | 'REVIEWED' | 'APPROVED' | 'REJECTED'
  reportedBy: string
  reportedUser: string
  createdAt: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
}

export function ContentReviewList({ statusFilter, searchTerm, typeFilter }: ContentReviewListProps) {
  const [items, setItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: Fetch content items with filters
    setItems([
      {
        id: '1',
        type: 'ANNOUNCEMENT',
        title: 'Livraison Paris-Lyon',
        content: 'Annonce avec prix anormalement élevé',
        status: 'PENDING',
        reportedBy: 'user123',
        reportedUser: 'user456',
        createdAt: '2024-01-15T10:30:00Z',
        priority: 'HIGH'
      },
      {
        id: '2',
        type: 'REVIEW',
        title: 'Avis négatif',
        content: 'Avis contenant des propos inappropriés',
        status: 'REVIEWED',
        reportedBy: 'user789',
        reportedUser: 'user101',
        createdAt: '2024-01-15T09:15:00Z',
        priority: 'MEDIUM'
      },
      {
        id: '3',
        type: 'COMMENT',
        title: 'Commentaire spam',
        content: 'Commentaire répétitif et non pertinent',
        status: 'REJECTED',
        reportedBy: 'user202',
        reportedUser: 'user303',
        createdAt: '2024-01-15T08:45:00Z',
        priority: 'LOW'
      }
    ])
    setLoading(false)
  }, [statusFilter, searchTerm, typeFilter])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />En attente</Badge>
      case 'REVIEWED':
        return <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" />Examiné</Badge>
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Approuvé</Badge>
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Rejeté</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return <Badge className="bg-red-100 text-red-800">Urgent</Badge>
      case 'HIGH':
        return <Badge className="bg-orange-100 text-orange-800">Élevée</Badge>
      case 'MEDIUM':
        return <Badge className="bg-yellow-100 text-yellow-800">Moyenne</Badge>
      case 'LOW':
        return <Badge className="bg-green-100 text-green-800">Faible</Badge>
      default:
        return <Badge variant="outline">{priority}</Badge>
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ANNOUNCEMENT':
        return <MessageSquare className="h-4 w-4 text-blue-500" />
      case 'REVIEW':
        return <Star className="h-4 w-4 text-yellow-500" />
      case 'COMMENT':
        return <MessageSquare className="h-4 w-4 text-green-500" />
      case 'USER_REPORT':
        return <Flag className="h-4 w-4 text-red-500" />
      default:
        return <Flag className="h-4 w-4 text-gray-500" />
    }
  }

  const handleAction = async (itemId: string, action: 'approve' | 'reject' | 'review') => {
    try {
      // TODO: API call to update status
      console.log(`Action ${action} on item ${itemId}`)
      
      setItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId
            ? {
                ...item,
                status: action === 'approve' ? 'APPROVED' : action === 'reject' ? 'REJECTED' : 'REVIEWED'
              }
            : item
        )
      )
    } catch (error) {
      console.error('Error updating content status:', error)
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
    <Card>
      <CardHeader>
        <CardTitle>Contenu à modérer ({items.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead>Contenu</TableHead>
              <TableHead>Signalé par</TableHead>
              <TableHead>Utilisateur concerné</TableHead>
              <TableHead>Priorité</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getTypeIcon(item.type)}
                    <span className="text-sm">{item.type}</span>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell className="max-w-xs truncate">{item.content}</TableCell>
                <TableCell className="text-sm">{item.reportedBy}</TableCell>
                <TableCell className="text-sm">{item.reportedUser}</TableCell>
                <TableCell>
                  {getPriorityBadge(item.priority)}
                </TableCell>
                <TableCell>
                  {getStatusBadge(item.status)}
                </TableCell>
                <TableCell className="text-sm">
                  {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {item.status === 'PENDING' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(item.id, 'approve')}
                        >
                          <CheckCircle className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(item.id, 'reject')}
                        >
                          <XCircle className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="outline">
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
} 