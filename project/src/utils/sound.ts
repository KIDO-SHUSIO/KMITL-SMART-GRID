// Web Audio API Synthesizer - ระบบเสียงแจ้งเตือน Energy Waste พร้อมพรีเซ็ตเสียงตื่นเต้นเร้าใจ
export type SoundPreset = 'red-alert' | 'cockpit' | 'chime';

let audioCtx: AudioContext | null = null;
let lastAlertTime = 0;
const COOLDOWN_MS = 1500;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const saved = localStorage.getItem('kses-sound');
    return saved !== 'off';
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('kses-sound', enabled ? 'on' : 'off');
    window.dispatchEvent(new CustomEvent('kses-sound-change', { detail: enabled }));
  } catch {
    // Ignore localStorage error
  }
}

export function getSoundPreset(): SoundPreset {
  if (typeof window === 'undefined') return 'red-alert';
  try {
    const saved = localStorage.getItem('kses-sound-preset') as SoundPreset | null;
    return saved === 'cockpit' || saved === 'chime' || saved === 'red-alert'
      ? saved
      : 'red-alert'; // ค่าเริ่มต้น: Red Alert ไซเรนตื่นเต้นเร้าใจ
  } catch {
    return 'red-alert';
  }
}

export function setSoundPreset(preset: SoundPreset): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('kses-sound-preset', preset);
    window.dispatchEvent(new CustomEvent('kses-sound-preset-change', { detail: preset }));
  } catch {
    // Ignore localStorage error
  }
}

/**
 * เล่นเสียงไซเรนฉุกเฉิน Red Alert (ตื่นเต้น เร้าใจ สไตล์ห้องควบคุมนิวเคลียร์/ไซไฟ)
 */
function playRedAlertSiren(ctx: AudioContext, t0: number): void {
  // Master Filter เพื่อให้เสียงแน่น ทรงพลัง
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(4500, t0);
  filter.Q.setValueAtTime(4.0, t0);
  filter.connect(ctx.destination);

  // 2 จังหวะไซเรนกวาดเสียงขึ้นอย่างรวดเร็ว (Urgent Whoop Siren)
  for (let i = 0; i < 2; i++) {
    const start = t0 + i * 0.32;
    const dur = 0.28;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'square';

    // กวาดความถี่จาก 500Hz พุ่งขึ้นไป 1500Hz แล้วทิ้งตัวลงเล็กน้อย
    osc1.frequency.setValueAtTime(480, start);
    osc1.frequency.exponentialRampToValueAtTime(1520, start + dur * 0.68);
    osc1.frequency.exponentialRampToValueAtTime(1100, start + dur);

    // Detune oscillator ที่ 2 เพื่อให้เสียงมีความหนาและน่าสะพรึงกลัว (Alarm Tension)
    osc2.frequency.setValueAtTime(485, start);
    osc2.frequency.exponentialRampToValueAtTime(1535, start + dur * 0.68);
    osc2.frequency.exponentialRampToValueAtTime(1110, start + dur);

    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(0.26, start + 0.025);
    gain.gain.setValueAtTime(0.24, start + dur * 0.68);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(filter);

    osc1.start(start);
    osc1.stop(start + dur);
    osc2.start(start);
    osc2.stop(start + dur);
  }

  // เสียง Sub-Bass Thump ตัดไฟ/เบรกเกอร์ทริป เพิ่มความตื่นเต้นช่วงเปิดเสียง
  const sub = ctx.createOscillator();
  const subGain = ctx.createGain();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(160, t0);
  sub.frequency.exponentialRampToValueAtTime(38, t0 + 0.45);

  subGain.gain.setValueAtTime(0.001, t0);
  subGain.gain.linearRampToValueAtTime(0.3, t0 + 0.02);
  subGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.45);

  sub.connect(subGain);
  subGain.connect(ctx.destination);
  sub.start(t0);
  sub.stop(t0 + 0.45);
}

/**
 * เล่นเสียง Master Warning สไตล์ห้องนักบิน (4-Burst Horn)
 */
function playCockpitWarning(ctx: AudioContext, t0: number): void {
  for (let i = 0; i < 4; i++) {
    const start = t0 + i * 0.13;
    const dur = 0.095;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(i % 2 === 0 ? 850 : 1150, start);

    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(0.24, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + dur);
  }
}

/**
 * เล่นเสียง Chime 2 โทนนุ่มนวล
 */
function playSoftChime(ctx: AudioContext, t0: number): void {
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'sine';
  osc2.type = 'triangle';

  osc1.frequency.setValueAtTime(880, t0);
  osc1.frequency.exponentialRampToValueAtTime(660, t0 + 0.2);

  osc2.frequency.setValueAtTime(587, t0 + 0.15);
  osc2.frequency.exponentialRampToValueAtTime(440, t0 + 0.38);

  gain.gain.setValueAtTime(0.2, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.4);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(t0);
  osc1.stop(t0 + 0.22);
  osc2.start(t0 + 0.15);
  osc2.stop(t0 + 0.4);
}

/**
 * เล่นเสียงสัญญาณเตือน Energy Waste ตามพรีเซ็ตที่เลือก
 */
export function playAlertSound(overridePreset?: SoundPreset): void {
  if (!isSoundEnabled() && !overridePreset) return;
  const now = Date.now();
  if (!overridePreset && now - lastAlertTime < COOLDOWN_MS) return;
  if (!overridePreset) lastAlertTime = now;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const preset = overridePreset || getSoundPreset();

    switch (preset) {
      case 'red-alert':
        playRedAlertSiren(ctx, t0);
        break;
      case 'cockpit':
        playCockpitWarning(ctx, t0);
        break;
      case 'chime':
        playSoftChime(ctx, t0);
        break;
      default:
        playRedAlertSiren(ctx, t0);
        break;
    }
  } catch (err) {
    console.warn('Audio alert playback error:', err);
  }
}
