// LINE Official Account (Messaging API) notification service for Energy Waste alerts.
// Gracefully skips when unconfigured; enforces per-room cooldown to prevent notification floods.
import { config } from './config';
import type { Room } from '../src/types';

export type MonthlyWaste = { kwh: number; baht: number; co2: number };

export interface NotifyPayload {
  room: Room;
  reasons: string[];
  monthly: MonthlyWaste;
  powerKw: number;
}

/** Formats a clean, readable alert message in Thai for LINE chat */
export function formatLineMessage(payload: NotifyPayload): string {
  const { room, reasons, monthly, powerKw } = payload;
  const time = new Date(room.lastUpdated).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const reasonText = reasons.length > 0 ? reasons.join('\n• ') : 'ตรวจพบการใช้พลังงานผิดปกติ';

  return [
    '🚨 แจ้งเตือน: ตรวจพบ Energy Waste!',
    '━━━━━━━━━━━━━━━━━━',
    `🏢 อาคาร: ${room.building}`,
    `🚪 ห้อง: Rm ${room.roomNumber} (${room.zone})`,
    `⚡ กระแส: ${room.current.toFixed(1)} A (${powerKw.toFixed(2)} kW)`,
    `👤 คนในห้อง: ${room.motion ? 'ตรวจพบความเคลื่อนไหว' : 'ไม่มีคนอยู่'}`,
    `📋 เหตุผลที่ตรวจพบ:\n• ${reasonText}`,
    `💰 ประเมินค่าไฟสูญเสีย: ฿${monthly.baht.toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} / เดือน`,
    '━━━━━━━━━━━━━━━━━━',
    `🕒 เวลา: ${time}`,
  ].join('\n');
}

const lastSentAt = new Map<string, number>();

/**
 * Sends an Energy Waste notification via LINE Messaging API.
 * Uses broadcast if LINE_TO_USER_OR_GROUP is not specified, otherwise push message.
 */
export async function sendLineWasteAlert(
  payload: NotifyPayload,
  fetchFn: typeof fetch = fetch,
): Promise<{ sent: boolean; reason?: string }> {
  const token = config.line.channelAccessToken;
  if (!token) {
    return { sent: false, reason: 'unconfigured' };
  }

  const now = Date.now();
  const last = lastSentAt.get(payload.room.id) ?? 0;
  if (now - last < config.line.cooldownMs) {
    return { sent: false, reason: 'cooldown' };
  }

  const messageText = formatLineMessage(payload);
  const to = config.line.to;

  const url = to
    ? 'https://api.line.me/v2/bot/message/push'
    : 'https://api.line.me/v2/bot/message/broadcast';

  const body = to
    ? { to, messages: [{ type: 'text', text: messageText }] }
    : { messages: [{ type: 'text', text: messageText }] };

  try {
    const res = await fetchFn(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      lastSentAt.set(payload.room.id, now);
      return { sent: true };
    }

    const errBody = await res.text().catch(() => '');
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'line_notify_failed',
        status: res.status,
        detail: errBody,
      }),
    );
    return { sent: false, reason: `HTTP ${res.status}` };
  } catch (err) {
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'line_notify_error',
        detail: (err as Error).message,
      }),
    );
    return { sent: false, reason: (err as Error).message };
  }
}

/** Resets in-memory cooldown cache (used by unit tests) */
export function resetNotifyCooldown(): void {
  lastSentAt.clear();
}
