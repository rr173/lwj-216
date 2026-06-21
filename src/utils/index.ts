export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${formatDate(timestamp)} ${hours}:${minutes}:${seconds}`;
}

export function getStartOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function getEndOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

export function getTimeSlotStart(timestamp: number, startHour: number, slotIndex: number): number {
  const date = new Date(timestamp);
  date.setHours(startHour, 0, 0, 0);
  return date.getTime() + slotIndex * 15 * 60 * 1000;
}

export function getTimeSlotEnd(timestamp: number, startHour: number, slotIndex: number): number {
  return getTimeSlotStart(timestamp, startHour, slotIndex) + 15 * 60 * 1000 - 1;
}

export function getCurrentSlotIndex(timestamp: number, startHour: number): number {
  const date = new Date(timestamp);
  const currentMinutes = (date.getHours() - startHour) * 60 + date.getMinutes();
  return Math.floor(currentMinutes / 15);
}

export function getTotalSlotCount(startHour: number, endHour: number): number {
  const totalMinutes = (endHour - startHour) * 60;
  return Math.floor(totalMinutes / 15);
}

export function isInTimeSlot(timestamp: number, startHour: number, endHour: number): boolean {
  const date = new Date(timestamp);
  const hour = date.getHours();
  return hour >= startHour && hour < endHour;
}

export function roundToCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function roundToDecimals(amount: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(amount * factor) / factor;
}

export function generateRandomId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
