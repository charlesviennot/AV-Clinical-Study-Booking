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

export const ALL_DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

export const getUpcomingWeeks = (count = 4) => {
  const weeks = [];
  const today = new Date();
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7));
  nextMonday.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < count; i++) {
    const start = new Date(nextMonday);
    start.setDate(nextMonday.getDate() + (i * 7));
    const end = new Date(start);
    end.setDate(start.getDate() + 4);
    
    const startStr = start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    const endStr = end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    const id = start.toISOString().split('T')[0];
    weeks.push({ id, label: `Semaine du ${startStr} au ${endStr}` });
  }
  return weeks;
};
