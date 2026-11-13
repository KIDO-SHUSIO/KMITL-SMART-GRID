import { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { isSoundEnabled, setSoundEnabled, playTestBeep } from '../utils/sound';

export default function SoundToggle() {
  const [enabled, setEnabled] = useState<boolean>(() => isSoundEnabled());

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      setEnabled(detail);
    };
    window.addEventListener('kses-sound-change', handler);
    return () => window.removeEventListener('kses-sound-change', handler);
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    setSoundEnabled(next);
    if (next) {
      playTestBeep();
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={enabled ? 'เสียงแจ้งเตือน: เปิดอยู่ (คลิกเพื่อปิด)' : 'เสียงแจ้งเตือน: ปิดอยู่ (คลิกเพื่อเปิด)'}
      aria-label={enabled ? 'Mute alert sound' : 'Unmute alert sound'}
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-mono transition-all backdrop-blur ${
        enabled
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-medium shadow-sm hover:bg-emerald-500/20'
          : 'border-slate-700/60 bg-charcoal-800/90 text-slate-400 hover:text-slate-200'
      }`}
    >
      {enabled ? (
        <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
      ) : (
        <VolumeX className="h-3.5 w-3.5 text-slate-500" />
      )}
      <span className="hidden sm:inline">{enabled ? 'Sound ON' : 'Sound OFF'}</span>
    </button>
  );
}
