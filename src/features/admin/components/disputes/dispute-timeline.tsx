'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { 
  MessageSquare,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Send
} from 'lucide-react'

interface TimelineEvent {
  id: string
  type: 'COMMENT' | 'STATUS_CHANGE' | 'RESOLUTION'
  author: string
  content: string
  timestamp: string
  status?: string
}

interface DisputeTimelineProps {
  disputeId: string
}

export function DisputeTimeline({ disputeId }: DisputeTimelineProps) {
  const t = useTranslations('admin.disputes')
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: Fetch timeline events
    setEvents([
      {
        id: '1',
        type: 'COMMENT',
        author: 'Jean Dupont',
        content: 'Le colis est arrivé endommagé. Je demande un remboursement.',
        timestamp: '2024-01-15T10:30:00Z'
      },
      {
        id: '2',
        type: 'STATUS_CHANGE',
        author: 'Admin',
        content: 'Statut changé en cours de traitement',
        timestamp: '2024-01-15T11:00:00Z',
        status: 'IN_PROGRESS'
      },
      {
        id: '3',
        type: 'COMMENT',
        author: 'Marie Martin',
        content: 'Je conteste cette accusation. Le colis était en parfait état lors de la livraison.',
        timestamp: '2024-01-15T11:30:00Z'
      },
      {
        id: '4',
        type: 'COMMENT',
        author: 'Admin',
        content: 'Nous examinons les preuves fournies par les deux parties.',
        timestamp: '2024-01-15T14:00:00Z'
      }
    ])
    setLoading(false)
  }, [disputeId])

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'COMMENT':
        return <MessageSquare className="h-4 w-4" />
      case 'STATUS_CHANGE':
        return <Clock className="h-4 w-4" />
      case 'RESOLUTION':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getEventColor = (type: string) => {
    switch (type) {
      case 'COMMENT':
        return 'bg-blue-100 text-blue-800'
      case 'STATUS_CHANGE':
        return 'bg-yellow-100 text-yellow-800'
      case 'RESOLUTION':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleAddComment = () => {
    if (!newComment.trim()) return

    const newEvent: TimelineEvent = {
      id: Date.now().toString(),
      type: 'COMMENT',
      author: 'Admin',
      content: newComment,
      timestamp: new Date().toISOString()
    }

    setEvents([newEvent, ...events])
    setNewComment('')
  }

  if (loading) {
    return <div className="text-muted-foreground">Loading timeline...</div>
  }

  return (
    <div className="space-y-6">
      {/* Add Comment */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span className="text-sm font-medium">Ajouter un commentaire</span>
        </div>
        <div className="flex gap-2">
          <Textarea
            placeholder={t('addComment')}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1"
            rows={3}
          />
          <Button 
            onClick={handleAddComment}
            disabled={!newComment.trim()}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {events.map((event, index) => (
          <div key={event.id} className="flex gap-4">
            {/* Timeline Line */}
            <div className="flex flex-col items-center">
              <div className={`p-2 rounded-full ${getEventColor(event.type)}`}>
                {getEventIcon(event.type)}
              </div>
              {index < events.length - 1 && (
                <div className="w-0.5 h-8 bg-gray-200 mt-2"></div>
              )}
            </div>

            {/* Event Content */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{event.author}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(event.timestamp).toLocaleString()}
                </span>
                {event.status && (
                  <Badge variant="outline" className="text-xs">
                    {event.status}
                  </Badge>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground">
                {event.content}
              </p>
            </div>
          </div>
        ))}
      </div>

      {events.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          {t('noTimelineEvents')}
        </div>
      )}
    </div>
  )
} 