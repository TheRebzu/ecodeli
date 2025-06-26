import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Euro, MapPin, User, Package, Clock, AlertTriangle, CheckCircle, XCircle, Pause } from "lucide-react"

export function AnnouncementDetails({ announcement, onModerate, onDelete }: any) {
  if (!announcement) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Détails de l'annonce</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h2 className="text-xl font-bold mb-2">{announcement.title}</h2>
          <div className="mb-2 text-muted-foreground">{announcement.description}</div>
          <div className="flex gap-2 mb-2">
            <Badge>{announcement.type}</Badge>
            <Badge>{announcement.status}</Badge>
            {announcement.isUrgent && <Badge variant="destructive">Urgent</Badge>}
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Euro className="w-4 h-4" />
            <span>{announcement.basePrice?.toFixed(2)} {announcement.currency}</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4" />
            <span>{announcement.pickupAddress}</span>
            <span>→</span>
            <span>{announcement.deliveryAddress}</span>
          </div>
          <div className="mb-2 text-xs text-muted-foreground">
            Créée le {new Date(announcement.createdAt).toLocaleString()}
          </div>
        </div>
        <div>
          <h3 className="font-semibold">Auteur</h3>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span>{announcement.author?.firstName} {announcement.author?.lastName} ({announcement.author?.email})</span>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={() => onModerate(announcement.id, 'APPROVE')}>Approuver</Button>
          <Button variant="outline" onClick={() => onModerate(announcement.id, 'SUSPEND')}>Suspendre</Button>
          <Button variant="outline" onClick={() => onModerate(announcement.id, 'FLAG')}>Signaler</Button>
          <Button variant="destructive" onClick={() => onDelete(announcement.id)}>Supprimer</Button>
        </div>
      </CardContent>
    </Card>
  )
} 