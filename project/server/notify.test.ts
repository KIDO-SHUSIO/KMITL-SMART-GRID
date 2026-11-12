import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formatLineMessage, sendLineWasteAlert, resetNotifyCooldown, type NotifyPayload } from './notify';
import { config } from './config';

const samplePayload: NotifyPayload = {
  room: {
    id: 'ecc-402',
    building: 'ECC Building',
    roomNumber: '402',
    current: 18.5,
    motion: false,
    status: 'Energy Waste',
    zone: 'Engineering',
    lastUpdated: 1793235298812,
  },
  reasons: ['กระแส 18.5 A ≥ 7.0 A และไม่มีคนอยู่'],
  monthly: { kwh: 1253.5, baht: 5264.7, co2: 626.75 },
  powerKw: 4.07,
};

describe('LINE Notification', () => {
  beforeEach(() => {
    resetNotifyCooldown();
    vi.restoreAllMocks();
  });

  it('formats a detailed Thai message with all necessary telemetry details', () => {
    const text = formatLineMessage(samplePayload);
    expect(text).toContain('ECC Building');
    expect(text).toContain('Rm 402');
    expect(text).toContain('18.5 A');
    expect(text).toContain('4.07 kW');
    expect(text).toContain('ไม่มีคนอยู่');
    expect(text).toContain('กระแส 18.5 A ≥ 7.0 A และไม่มีคนอยู่');
    expect(text).toContain('5,264.70');
  });

  it('skips gracefully when token is not configured', async () => {
    const originalToken = config.line.channelAccessToken;
    (config.line as { channelAccessToken: string }).channelAccessToken = '';
    try {
      const mockFetch = vi.fn();
      const res = await sendLineWasteAlert(samplePayload, mockFetch as unknown as typeof fetch);
      expect(res.sent).toBe(false);
      expect(res.reason).toBe('unconfigured');
      expect(mockFetch).not.toHaveBeenCalled();
    } finally {
      (config.line as { channelAccessToken: string }).channelAccessToken = originalToken;
    }
  });

  it('sends broadcast when token is set and to is empty', async () => {
    const originalToken = config.line.channelAccessToken;
    (config.line as { channelAccessToken: string }).channelAccessToken = 'test-token-123';

    try {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      const res = await sendLineWasteAlert(samplePayload, mockFetch as unknown as typeof fetch);
      expect(res.sent).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.line.me/v2/bot/message/broadcast',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token-123',
          }),
        }),
      );
    } finally {
      (config.line as { channelAccessToken: string }).channelAccessToken = originalToken;
    }
  });

  it('enforces cooldown per room and blocks consecutive alerts within cooldown window', async () => {
    const originalToken = config.line.channelAccessToken;
    (config.line as { channelAccessToken: string }).channelAccessToken = 'test-token-123';

    try {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      // First alert passes
      const first = await sendLineWasteAlert(samplePayload, mockFetch as unknown as typeof fetch);
      expect(first.sent).toBe(true);

      // Immediate second alert for same room is throttled by cooldown
      const second = await sendLineWasteAlert(samplePayload, mockFetch as unknown as typeof fetch);
      expect(second.sent).toBe(false);
      expect(second.reason).toBe('cooldown');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    } finally {
      (config.line as { channelAccessToken: string }).channelAccessToken = originalToken;
    }
  });

  it('handles API errors from LINE without throwing', async () => {
    const originalToken = config.line.channelAccessToken;
    (config.line as { channelAccessToken: string }).channelAccessToken = 'test-token-123';

    try {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Invalid token',
      });

      const res = await sendLineWasteAlert(samplePayload, mockFetch as unknown as typeof fetch);
      expect(res.sent).toBe(false);
      expect(res.reason).toBe('HTTP 401');
    } finally {
      (config.line as { channelAccessToken: string }).channelAccessToken = originalToken;
    }
  });
});

