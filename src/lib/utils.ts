export function generateCode(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function roundToNearest15(date: Date): Date {
  const d = new Date(date);
  const minutes = d.getMinutes();
  const rounded = Math.round(minutes / 15) * 15;
  d.setMinutes(rounded, 0, 0);
  return d;
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
}

export function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(Math.abs(ms) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function getDayStart(date: Date, dayBreakHour: number): Date {
  const d = new Date(date);
  if (d.getHours() < dayBreakHour) {
    d.setDate(d.getDate() - 1);
  }
  d.setHours(dayBreakHour, 0, 0, 0);
  return d;
}

export interface ParsedFeeding {
  time: Date;
  amount_ml: number;
}

export function parseFeedingImport(text: string): ParsedFeeding[] {
  const lines = text.trim().split('\n');
  const results: ParsedFeeding[] = [];
  let currentDate: Date | null = null;
  let lastHour = -1;
  let dayOffset = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Try to parse as date header (e.g., "4/3", "4/3/2026")
    const dateMatch = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?$/);
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]);
      const year = dateMatch[3]
        ? parseInt(dateMatch[3]) < 100
          ? 2000 + parseInt(dateMatch[3])
          : parseInt(dateMatch[3])
        : new Date().getFullYear();
      currentDate = new Date(year, month - 1, day);
      lastHour = -1;
      dayOffset = 0;
      continue;
    }

    // Try to parse as feeding line (e.g., "10.30 - 65 ml", "10:30 - 65ml")
    const feedingMatch = trimmed.match(/(\d{1,2})[\.:](\d{2})\s*[-–]\s*(\d+)\s*(?:ml)?/i);
    if (feedingMatch && currentDate) {
      const hour = parseInt(feedingMatch[1]);
      const minute = parseInt(feedingMatch[2]);
      const amount = parseInt(feedingMatch[3]);

      // Detect midnight crossing
      if (hour < lastHour && lastHour > 12) {
        dayOffset++;
      }
      lastHour = hour;

      const feedTime = new Date(currentDate);
      feedTime.setDate(feedTime.getDate() + dayOffset);
      feedTime.setHours(hour, minute, 0, 0);

      results.push({ time: feedTime, amount_ml: amount });
    }
  }

  return results;
}
