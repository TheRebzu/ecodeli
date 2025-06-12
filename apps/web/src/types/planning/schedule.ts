// Types pour la planification
export interface Schedule {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  userId: string;
  type: 'DELIVERY' | 'APPOINTMENT' | 'MAINTENANCE';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  available: boolean;
  scheduleId: string;
}

export interface SchedulePreferences {
  workingHours: {
    start: string;
    end: string;
  };
  workingDays: number[];
  timeZone: string;
}