// Web Audio API Synthesizer สำหรับสร้างเสียงแจ้งเตือน Energy Waste โดยไม่ต้องโหลดไฟล์ภายนอก
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
 * เล่นเสียงสัญญาณเตือน Energy Waste (เสียง Chime 2 โทนแบบห้องควบคุมวิศวกรรม)
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

    // Pulse 1: 880Hz (A5) นุ่มนวล
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, t0);
    osc1.frequency.exponentialRampToValueAtTime(700, t0 + 0.15);
    gain1.gain.setValueAtTime(0.18, t0);
    gain1.gain.exponentialRampToValueAtTime(0.01, t0 + 0.18);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(t0);
    osc1.stop(t0 + 0.18);

    // Pulse 2: 587Hz (D5) ก้องกังวานเตือนความสนใจ
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(587, t0 + 0.14);
    osc2.frequency.exponentialRampToValueAtTime(440, t0 + 0.36);
    gain2.gain.setValueAtTime(0.2, t0 + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.005, t0 + 0.38);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t0 + 0.14);
    osc2.stop(t0 + 0.38);
  } catch (err) {
    console.warn('Audio alert playback error:', err);
  }
}

/**
 * เสียง Beep สั้นๆ เวลาคลิกเปิดใช้งานเสียง เพื่อทดสอบและปลดล็อก AudioContext ของเบราว์เซอร์
 */
export function playTestBeep(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(659.25, t0); // E5
    gain.gain.setValueAtTime(0.12, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.12);
  } catch {
    // Ignore autoplay policy restriction
  }
}
