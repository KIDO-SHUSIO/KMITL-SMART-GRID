import type { Room, RoomStatus } from '../types';
import { analyze, monthlyWaste } from '../engine/energy';

export const INITIAL_ROOMS: Room[] = [
  {
    id: 'ecc-402',
    building: 'ECC Building',
    roomNumber: '402',
    current: 3.2,
    motion: true,
    status: 'Normal',
    lastUpdated: Date.now(),
    zone: 'Engineering',
  },
  {
    id: 'ecc-403',
    building: 'ECC Building',
    roomNumber: '403',
    current: 12.8,
    motion: false,
    status: 'Energy Waste',
    lastUpdated: Date.now(),
    zone: 'Engineering',
  },
  {
    id: 'it-105',
    building: 'IT Building',
    roomNumber: '105',
    current: 2.1,
    motion: true,
    status: 'Normal',
    lastUpdated: Date.now(),
    zone: 'Information Tech',
  },
  {
    id: 'it-204',
    building: 'IT Building',
    roomNumber: '204',
    current: 8.6,
    motion: false,
    status: 'Energy Waste',
    lastUpdated: Date.now(),
    zone: 'Information Tech',
  },
  {
    id: 'ee-lab-1',
    building: 'EE Building',
    roomNumber: 'Lab 1',
    current: 1.8,
    motion: true,
    status: 'Normal',
    lastUpdated: Date.now(),
    zone: 'Electrical',
  },
  {
    id: 'me-301',
    building: 'ME Building',
    roomNumber: '301',
    current: 4.4,
    motion: false,
    status: 'Normal',
    lastUpdated: Date.now(),
    zone: 'Mechanical',
  },
];

export function evaluateStatus(current: number, motion: boolean): RoomStatus {
  return analyze(current, motion).status;
}

export interface SavingsSummary {
  baht: number;
  kwh: number;
  co2: number;
}

// Summary of potential monthly savings (baht, kWh, CO2 kg) if every flagged room were switched off
export function computeSavings(rooms: Room[]): SavingsSummary {
  const wasteRooms = rooms.filter((r) => r.status === 'Energy Waste');
  let totalBaht = 0;
  let totalKwh = 0;
  let totalCo2 = 0;
  for (const r of wasteRooms) {
    const w = monthlyWaste(r.current);
    totalBaht += w.baht;
    totalKwh += w.kwh;
    totalCo2 += w.co2;
  }
  return {
    baht: Math.round(totalBaht),
    kwh: Math.round(totalKwh),
    co2: Math.round(totalCo2 * 10) / 10,
  };
}

// Potential monthly savings (baht) if every flagged room were switched off
export function computeEnergySaved(rooms: Room[]): number {
  return computeSavings(rooms).baht;
}

export function countCritical(rooms: Room[]): number {
  return rooms.filter((r) => r.status === 'Energy Waste').length;
}
