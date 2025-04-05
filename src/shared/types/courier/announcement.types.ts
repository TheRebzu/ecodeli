export interface CourierAnnouncement {
  id: string;
  title: string;
  description: string;
  fromLocation: string;
  toLocation: string;
  date: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface CreateAnnouncementInput {
  title: string;
  description: string;
  fromLocation: string;
  toLocation: string;
  date: string;
}