import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DEFAULT_TIMESLOTS = [
  '09h00 - 10h30',
  '10h30 - 12h00',
  '13h00 - 14h30',
  '14h30 - 16h00',
  '16h00 - 17h30'
];

export const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

export const getFormattedDateForDay = (startDate: number, dayName: string) => {
  const dayIndex = DAYS.indexOf(dayName);
  if (dayIndex === -1) return '';
  const date = new Date(startDate);
  date.setDate(date.getDate() + dayIndex);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
};

// Helper to sort timeslots logically (e.g., "09h00 - 10h30" before "17h30 - 19h00")
export const sortTimeSlots = (slots: string[]) => {
  return [...slots].sort((a, b) => {
    const extractTime = (str: string) => {
      const match = str.match(/(\d{1,2})[h:]?(\d{2})?/i);
      if (!match) return 0;
      const hours = parseInt(match[1], 10);
      const minutes = match[2] ? parseInt(match[2], 10) : 0;
      return hours * 60 + minutes;
    };
    return extractTime(a) - extractTime(b);
  });
};

export const generateGoogleCalendarLink = (title: string, startDateTs: number, durationMinutes: number = 90, details: string = "", location: string = "AudioVitality") => {
  const start = new Date(startDateTs);
  const end = new Date(startDateTs + durationMinutes * 60000);

  const formatGoogleDate = (date: Date) => {
    return date.toISOString().replace(/-|:|\.\d\d\d/g, '');
  };

  const dates = `${formatGoogleDate(start)}/${formatGoogleDate(end)}`;
  const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  
  const params = new URLSearchParams({
    text: title,
    dates: dates,
    details: details,
    location: location,
  });

  return `${baseUrl}&${params.toString()}`;
};

export const generateWeekData = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const getWeekNumber = (d: Date) => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const weekId = `${monday.getFullYear()}-W${getWeekNumber(monday).toString().padStart(2, '0')}`;
  
  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const label = `Semaine du ${monday.getDate()} ${months[monday.getMonth()]} au ${sunday.getDate()} ${months[sunday.getMonth()]}`;

  return { id: weekId, label, startDate: monday.getTime() };
};
