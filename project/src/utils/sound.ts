// Web Audio API Synthesizer - Sci-Fi Cybernetic Emergency Klaxon & Sub-Bass Alert
let audioCtx: AudioContext | null = null;
let lastAlertTime = 0;
const COOLDOWN_MS = 2000;

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
    return saved !== 'off'; // ค่าเริ่มต้น: เปิดเสียง
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
    // Ignore localStorage errors
  }
}

/**
 * เล่นเสียงสัญญาณเตือนฉุกเฉิน Energy Waste สไตล์ Sci-Fi Cyber Klaxon + Sub-Bass
 * จังหวะ: Chirp 1 -> Chirp 2 -> Alarm Sweep + Sub-bass Breaker Thump
 */
export function playAlertSound(): void {
  if (!isSoundEnabled()) return;
  const now = Date.now();
  if (now - lastAlertTime < COOLDOWN_MS) return;
  lastAlertTime = now;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t0 = ctx.currentTime;

    // Master Resonant Low-Pass Filter คุมโทนให้ดุดัน หนักแน่น สไตล์ห้องควบคุมอัจฉริยะ
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3800, t0);
    filter.Q.setValueAtTime(3.8, t0);
    filter.connect(ctx.destination);

    // ตัวกำเนิดคลื่นเสียงความถี่กวาด (Cyber Alarm Chirp) พร้อม Detune Harmonic
    const createChirp = (
      startTime: number,
      duration: number,
      startFreq: number,
      endFreq: number,
      volume: number
    ) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(startFreq, startTime);
      osc1.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);

      // Detune เล็กน้อยเพื่อสร้างความรู้สึกกังวานและตื่นเต้น (Chorus presence)
      osc2.frequency.setValueAtTime(startFreq * 1.015, startTime);
      osc2.frequency.exponentialRampToValueAtTime(endFreq * 1.015, startTime + duration);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(filter);

      osc1.start(startTime);
      osc1.stop(startTime + duration);
      osc2.start(startTime);
      osc2.stop(startTime + duration);
    };

    // Pulse 1: Warning Chirp จังหวะแรก (620Hz -> 1250Hz)
    createChirp(t0, 0.11, 620, 1250, 0.22);

    // Pulse 2: Warning Chirp จังหวะสอง กระชับและถี่ขึ้น (780Hz -> 1560Hz)
    createChirp(t0 + 0.13, 0.11, 780, 1560, 0.24);

    // Pulse 3: Siren Climax ดิ่งลงอย่างดุดัน (1760Hz -> 660Hz)
    createChirp(t0 + 0.26, 0.28, 1760, 660, 0.26);

    // Sub-Bass Thump: เบสลูกใหญ่สไตล์หม้อแปลง/เบรกเกอร์ทริป (160Hz -> 42Hz)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(160, t0 + 0.26);
    subOsc.frequency.exponentialRampToValueAtTime(42, t0 + 0.54);

    subGain.gain.setValueAtTime(0.001, t0 + 0.26);
    subGain.gain.linearRampToValueAtTime(0.26, t0 + 0.28);
    subGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.54);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);

    subOsc.start(t0 + 0.26);
    subOsc.stop(t0 + 0.54);
  } catch (err) {
    console.warn('Audio alert playback error:', err);
  }
}

/**
 * เสียง Activate Sci-Fi Tech Blip เวลาคลิกเปิดเสียงบนเมนู
 */
export function playTestBeep(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const t0 = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, t0);
    osc.frequency.exponentialRampToValueAtTime(1180, t0 + 0.08);

    gain.gain.setValueAtTime(0.01, t0);
    gain.gain.linearRampToValueAtTime(0.2, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.12);
  } catch {
    // Ignore autoplay restriction
  }
}
