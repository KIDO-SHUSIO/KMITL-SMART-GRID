import { useEffect, useRef, useState } from 'react';
import { VolumeX, ChevronDown, Play, Siren, Bell, ShieldAlert } from 'lucide-react';
import {
  isSoundEnabled,
  setSoundEnabled,
  getSoundPreset,
  setSoundPreset,
  playAlertSound,
  type SoundPreset,
} from '../utils/sound';

const PRESETS: { id: SoundPreset; label: string; icon: typeof Siren; desc: string }[] = [
  {
    id: 'red-alert',
    label: 'Red Alert',
    icon: Siren,
    desc: 'ไซเรนฉุกเฉินระดับวิกฤต (ตื่นเต้น เร้าใจ)',
  },
  {
    id: 'cockpit',
    label: 'Cockpit Warning',
    icon: ShieldAlert,
    desc: 'สัญญาณเตือนแบบห้องนักบิน 4 จังหวะ',
  },
  {
    id: 'chime',
    label: 'Soft Chime',
    icon: Bell,
    desc: 'เสียงกระดิ่งนุ่มนวล',
  },
];

export default function SoundToggle() {
  const [enabled, setEnabled] = useState<boolean>(() => isSoundEnabled());
  const [preset, setPreset] = useState<SoundPreset>(() => getSoundPreset());
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSoundChange = (e: Event) => {
      setEnabled((e as CustomEvent<boolean>).detail);
    };
    const handlePresetChange = (e: Event) => {
      setPreset((e as CustomEvent<SoundPreset>).detail);
    };

    window.addEventListener('kses-sound-change', handleSoundChange);
    window.addEventListener('kses-sound-preset-change', handlePresetChange);

    return () => {
      window.removeEventListener('kses-sound-change', handleSoundChange);
      window.removeEventListener('kses-sound-preset-change', handlePresetChange);
    };
  }, []);

  // ปิดเมนูเมื่อคลิกด้านนอก
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const toggleSound = () => {
    const next = !enabled;
    setEnabled(next);
    setSoundEnabled(next);
    if (next) {
      // เมื่อเปิดเสียง ให้เล่นพรีวิวเสียงไซเรนฉุกเฉินทันทีเพื่อทดสอบ
      playAlertSound(preset);
    }
  };

  const selectPreset = (p: SoundPreset) => {
    setPreset(p);
    setSoundPreset(p);
    if (!enabled) {
      setEnabled(true);
      setSoundEnabled(true);
    }
    // เล่นทดสอบเสียงพรีเซ็ตทันที
    playAlertSound(p);
  };

  const activePresetInfo = PRESETS.find((p) => p.id === preset) || PRESETS[0];
  const ActiveIcon = activePresetInfo.icon;

  return (
    <div className="relative inline-flex items-center" ref={menuRef}>
      <div
        className={`flex items-center rounded-lg border text-[11px] font-mono transition-all backdrop-blur ${
          enabled
            ? 'border-red-500/50 bg-red-500/10 text-red-400 font-medium shadow-[0_0_12px_rgba(239,68,68,0.2)]'
            : 'border-slate-700/60 bg-charcoal-800/90 text-slate-400 hover:text-slate-200'
        }`}
      >
        {/* ปุ่มเปิด-ปิดเสียง */}
        <button
          type="button"
          onClick={toggleSound}
          title={enabled ? 'เสียงแจ้งเตือน: เปิดอยู่ (คลิกเพื่อปิด)' : 'เสียงแจ้งเตือน: ปิดอยู่ (คลิกเพื่อเปิด)'}
          className="flex items-center gap-1.5 px-2.5 py-1 transition-colors hover:opacity-80"
        >
          {enabled ? (
            <ActiveIcon className="h-3.5 w-3.5 text-red-400 animate-pulse" />
          ) : (
            <VolumeX className="h-3.5 w-3.5 text-slate-500" />
          )}
          <span className="hidden sm:inline">
            {enabled ? activePresetInfo.label : 'Sound OFF'}
          </span>
        </button>

        {/* ปุ่มเปิดเมนูเลือกเสียง & ทดสอบ */}
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          title="เลือกแบบเสียงแจ้งเตือน"
          aria-expanded={menuOpen}
          className="border-l border-slate-700/60 px-1.5 py-1 hover:bg-slate-700/30 transition-colors"
        >
          <ChevronDown className={`h-3 w-3 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Popover เลือกพรีเซ็ตเสียง */}
      {menuOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-charcoal-600/80 bg-charcoal-900/95 p-2 shadow-2xl backdrop-blur-md">
          <div className="px-2 py-1 border-b border-charcoal-600/60 pb-1.5 mb-1 text-[10px] font-mono uppercase tracking-wider text-slate-400">
            เลือกแบบเสียงแจ้งเตือน
          </div>

          <div className="space-y-1">
            {PRESETS.map((p) => {
              const Icon = p.icon;
              const isSelected = preset === p.id && enabled;
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between rounded-lg p-1.5 transition-all ${
                    isSelected
                      ? 'bg-red-500/20 text-red-300 font-bold'
                      : 'hover:bg-charcoal-700/60 text-slate-300'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectPreset(p.id)}
                    className="flex flex-1 items-center gap-2 text-left text-xs"
                  >
                    <Icon className={`h-3.5 w-3.5 ${isSelected ? 'text-red-400' : 'text-slate-400'}`} />
                    <div>
                      <div className="text-[11px] font-mono leading-tight">{p.label}</div>
                      <div className="text-[9px] text-slate-400 font-sans leading-tight">{p.desc}</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    title={`ทดสอบเสียง ${p.label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      playAlertSound(p.id);
                    }}
                    className="ml-1 flex h-6 w-6 items-center justify-center rounded-md bg-charcoal-700/80 text-slate-300 hover:bg-red-500/30 hover:text-red-300"
                  >
                    <Play className="h-3 w-3 fill-current" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-2 pt-1.5 border-t border-charcoal-600/60 text-center">
            <button
              type="button"
              onClick={() => {
                playAlertSound();
              }}
              className="w-full flex items-center justify-center gap-1.5 rounded-md bg-red-600/20 py-1 text-[10px] font-mono text-red-400 hover:bg-red-600/30 transition-colors"
            >
              <Play className="h-2.5 w-2.5 fill-current" /> ทดสอบเสียงที่เลือก ({activePresetInfo.label})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
