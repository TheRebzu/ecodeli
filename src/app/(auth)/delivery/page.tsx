import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

const deliveries = [
  {
    id: 1,
    from: "Paris",
    to: "Marseille",
    status: "En cours",
    date: "2025-03-01",
    courier: "Jean Dupont",
  },
  {
    id: 2,
    from: "Lyon",
    to: "Bordeaux",
    status: "Planifiée",
    date: "2025-03-03",
    courier: "Marie Martin",
  },
  {
    id: 3,
    from: "Lille",
    to: "Strasbourg",
    status: "Terminée",
    date: "2025-02-28",
    courier: "Pierre Durand",
  },
]

export default function DeliveriesPage() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Livraisons</h1>
        <Button>Nouvelle livraison</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>De</TableHead>
            <TableHead>À</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Livreur</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deliveries.map((delivery) => (
            <TableRow key={delivery.id}>
              <TableCell>{delivery.from}</TableCell>
              <TableCell>{delivery.to}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    delivery.status === "En cours"
                      ? "default"
                      : delivery.status === "Planifiée"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {delivery.status}
                </Badge>
              </TableCell>
              <TableCell>{delivery.date}</TableCell>
              <TableCell>{delivery.courier}</TableCell>
              <TableCell>
                <Button variant="outline" size="sm">
                  Détails
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

