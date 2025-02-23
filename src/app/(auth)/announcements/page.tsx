import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const announcements = [
  {
    id: 1,
    title: "Livraison Paris-Marseille",
    type: "Colis",
    status: "En attente",
    date: "2025-03-01",
  },
  {
    id: 2,
    title: "Courses à domicile",
    type: "Service",
    status: "Acceptée",
    date: "2025-03-02",
  },
  {
    id: 3,
    title: "Transport aéroport",
    type: "Transport",
    status: "Terminée",
    date: "2025-02-28",
  },
]

export default function AnnouncementsPage() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Annonces</h1>
        <Button>Créer une annonce</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titre</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {announcements.map((announcement) => (
            <TableRow key={announcement.id}>
              <TableCell>{announcement.title}</TableCell>
              <TableCell>{announcement.type}</TableCell>
              <TableCell>{announcement.status}</TableCell>
              <TableCell>{announcement.date}</TableCell>
              <TableCell>
                <Button variant="outline" size="sm">
                  Voir détails
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

