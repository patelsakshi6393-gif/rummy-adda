import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getShortPlayerId(playerId?: string | null): string {
  if (!playerId) return '4921';
  const cleaned = playerId.replace(/[^a-zA-Z0-9]/g, '');
  return cleaned.length > 4 ? cleaned.slice(-4).toUpperCase() : cleaned.toUpperCase();
}

export function getUserMobile(phone?: string | null, email?: string | null): string {
  if (phone && phone.trim().length >= 10) {
    return phone.trim();
  }
  if (email && email.includes('@phone.rummyadda.in')) {
    return email.split('@')[0];
  }
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('rummy_user_mobile');
    if (saved && saved.trim().length >= 10) return saved.trim();
  }
  return '';
}

