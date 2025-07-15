"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import ChatBox from '@/components/chat/ChatBox';

interface SupportTicket {
  id: string;
  ticketNumber: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  author?: { id: string; name?: string; email?: string };
}

export default function AdminSupportTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    fetch('/api/support/tickets?limit=50')
      .then((res) => res.json())
      .then((data) => setTickets(data.tickets || data.result?.tickets || []));
  }, []);

  const getStatusBadge = (status: string) => {
    const config: any = {
      OPEN: { label: 'Ouvert', color: 'bg-green-100 text-green-800' },
      IN_PROGRESS: { label: 'En cours', color: 'bg-blue-100 text-blue-800' },
      WAITING_CUSTOMER: { label: 'Attente client', color: 'bg-yellow-100 text-yellow-800' },
      RESOLVED: { label: 'Résolu', color: 'bg-purple-100 text-purple-800' },
      CLOSED: { label: 'Fermé', color: 'bg-gray-100 text-gray-800' },
    };
    const c = config[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    return <Badge className={c.color}>{c.label}</Badge>;
  };

  // Fonction pour fermer un ticket
  const handleCloseTicket = async (ticketId: string) => {
    await fetch(`/api/support/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CLOSED' }),
    });
    setDrawerOpen(false);
    setSelectedTicket(null);
    // Rafraîchir la liste
    fetch('/api/support/tickets?limit=50')
      .then((res) => res.json())
      .then((data) => setTickets(data.tickets || data.result?.tickets || []));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tickets Support</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 px-3 text-left">Numéro</th>
                  <th className="py-2 px-3 text-left">Sujet</th>
                  <th className="py-2 px-3 text-left">Catégorie</th>
                  <th className="py-2 px-3 text-left">Priorité</th>
                  <th className="py-2 px-3 text-left">Statut</th>
                  <th className="py-2 px-3 text-left">Date</th>
                  <th className="py-2 px-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono">{ticket.ticketNumber}</td>
                    <td className="py-2 px-3">{ticket.title}</td>
                    <td className="py-2 px-3">{ticket.category}</td>
                    <td className="py-2 px-3">
                      <Badge>{ticket.priority}</Badge>
                    </td>
                    <td className="py-2 px-3">{getStatusBadge(ticket.status)}</td>
                    <td className="py-2 px-3">{new Date(ticket.createdAt).toLocaleString('fr-FR')}</td>
                    <td className="py-2 px-3">
                      <Drawer open={drawerOpen && selectedTicket?.id === ticket.id} onOpenChange={(open) => { setDrawerOpen(open); if (!open) setSelectedTicket(null); }}>
                        <DrawerTrigger asChild>
                          <Button size="sm" variant="outline" onClick={() => { setSelectedTicket(ticket); setDrawerOpen(true); }}>Répondre</Button>
                        </DrawerTrigger>
                        <DrawerContent>
                          <DrawerHeader>
                            <DrawerTitle>Ticket #{ticket.ticketNumber} - {ticket.title}</DrawerTitle>
                          </DrawerHeader>
                          <div className="p-4">
                            <ChatBox contextType="SUPPORT" contextId={ticket.id} />
                            <div className="mt-4 flex justify-end">
                              <Button
                                variant="destructive"
                                disabled={ticket.status === 'CLOSED'}
                                onClick={() => handleCloseTicket(ticket.id)}
                              >
                                Fermer le ticket
                              </Button>
                            </div>
                          </div>
                        </DrawerContent>
                      </Drawer>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 