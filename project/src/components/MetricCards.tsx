import { useState } from 'react';
import { Zap, Building2, TrendingUp, Leaf, Activity, Info, X } from 'lucide-react';

interface Props {
  energySaved: number;
  savings?: { baht: number; kwh: number; co2: number };
  criticalRooms: number;
  uptime: number;
  totalRooms: number;
}

export default function MetricCards({ energySaved, savings, criticalRooms, uptime, totalRooms }: Props) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const baht = savings ? savings.baht : energySaved;
  const kwh = savings ? savings.kwh : Math.round(baht / 4.2);
  const co2 = savings ? savings.co2 : Math.round(kwh * 0.5 * 10) / 10;

  const metrics = [
    {
      id: 'savings',
      label: 'Potential Cost Savings',
      value: `฿${baht.toLocaleString()}`,
      unit: '/ month',
      icon: Zap,
      accent: 'text-kmitl-green',
      glow: 'shadow-[0_0_24px_rgba(57,255,122,0.18)]',
      ring: 'border-kmitl-green/30',
      sub: `ประหยัดไฟ ~${kwh.toLocaleString()} kWh/เดือน`,
      formula: {
        title: '⚡ สูตรคำนวณเงินประหยัดค่าไฟ',
        steps: [
          '1. กำลังไฟ (kW) = (Current A × 220V) ÷ 1,000',
          '2. พลังงาน (kWh) = kW × 308 ชม. (14 ชม./วัน × 22 วัน)',
          '3. ค่าไฟประหยัด = kWh × 4.2 บาท/kWh',
        ],
        note: 'คำนวณจากห้องที่เป็น Energy Waste หากปิดเครื่องใช้ไฟฟ้า',
      },
    },
    {
      id: 'carbon',
      label: 'CO₂ Reduction',
      value: co2.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      unit: 'kg CO₂e / month',
      icon: Leaf,
      accent: 'text-emerald-400',
      glow: 'shadow-[0_0_24px_rgba(52,211,153,0.22)]',
      ring: 'border-emerald-500/30',
      sub: `ลดก๊าซเรือนกระจก (0.5 kg/kWh)`,
      formula: {
        title: '🍃 สูตรคำนวณการลดก๊าซคาร์บอน (CO₂)',
        steps: [
          'ลดคาร์บอน = พลังงานประหยัด (kWh) × 0.5 kg CO₂e',
          'อิงค่ามาตรฐาน Grid Emission Factor ของไทย',
          '1 kWh จากโรงไฟฟ้า ปล่อย CO₂ ~0.4999 ≈ 0.5 kg (อบก. - TGO)',
        ],
        note: 'การประหยัดไฟ 1 หน่วย ช่วยลดก๊าซเรือนกระจกได้ครึ่งกิโลกรัม',
      },
    },
    {
      id: 'critical',
      label: 'Critical Rooms Active',
      value: criticalRooms.toString(),
      unit: `of ${totalRooms} rooms`,
      icon: Building2,
      accent: criticalRooms > 0 ? 'text-red-400' : 'text-kmitl-orange-light',
      glow:
        criticalRooms > 0
          ? 'shadow-[0_0_24px_rgba(248,113,113,0.22)]'
          : 'shadow-[0_0_24px_rgba(255,106,0,0.18)]',
      ring: criticalRooms > 0 ? 'border-red-500/40' : 'border-kmitl-orange/30',
      sub: criticalRooms > 0 ? 'ตรวจพบห้องเปิดไฟ/แอร์ทิ้งไว้' : 'All systems nominal',
    },
    {
      id: 'uptime',
      label: 'System Uptime',
      value: uptime.toFixed(1),
      unit: '%',
      icon: Activity,
      accent: 'text-kmitl-orange-light',
      glow: 'shadow-[0_0_24px_rgba(255,106,0,0.18)]',
      ring: 'border-kmitl-orange/30',
      sub: 'Last 30 days continuous',
    },
    {
      id: 'rooms',
      label: 'Rooms Monitored',
      value: totalRooms.toString(),
      unit: 'live nodes',
      icon: TrendingUp,
      accent: 'text-sky-400',
      glow: 'shadow-[0_0_24px_rgba(56,189,248,0.18)]',
      ring: 'border-sky-500/30',
      sub: 'Real-time telemetry',
    },
  ];

  return (
    <div className="relative z-30 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
      {metrics.map((m) => {
        const Icon = m.icon;
        const hasFormula = Boolean(m.formula);
        const isOpen = activeTooltip === m.id;

        return (
          <div
            key={m.id}
            className={`relative ${
              isOpen ? 'z-40' : 'z-0'
            } rounded-xl border ${m.ring} bg-charcoal-800/70 backdrop-blur p-4 sm:p-5 ${m.glow} transition-transform duration-300 hover:-translate-y-0.5`}
          >
            <div className="overflow-hidden absolute inset-0 rounded-xl pointer-events-none">
              <div className="absolute right-0 top-0 h-20 w-20 -translate-y-6 translate-x-6 rounded-full bg-gradient-to-br from-white/5 to-transparent blur-xl" />
            </div>

            <div className="relative flex items-start justify-between">
              <div className="pr-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                  {m.label}
                </p>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className={`font-mono text-3xl font-bold ${m.accent}`}>{m.value}</span>
                  <span className="text-xs font-medium text-slate-400">{m.unit}</span>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">{m.sub}</p>
              </div>

              {/* Icon Container with Tooltip/Popover */}
              <div className={`relative shrink-0 ${isOpen ? 'z-50' : ''}`}>
                <button
                  type="button"
                  title={hasFormula ? 'แตะหรือชี้เพื่อดูสูตรคำนวณ' : undefined}
                  onClick={() => hasFormula && setActiveTooltip(isOpen ? null : m.id)}
                  onMouseEnter={() => hasFormula && setActiveTooltip(m.id)}
                  onMouseLeave={() => hasFormula && setActiveTooltip(null)}
                  className={`group relative flex items-center justify-center rounded-lg bg-charcoal-700/80 p-2.5 transition-all ${
                    m.accent
                  } ${
                    hasFormula
                      ? 'cursor-pointer hover:bg-charcoal-600 hover:ring-2 hover:ring-current/50 active:scale-95'
                      : ''
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {hasFormula && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-charcoal-900 border border-slate-600 text-[9px] text-slate-300">
                      <Info className="h-2 w-2" />
                    </span>
                  )}
                </button>

                {/* Formula Popover on Hover / Tap */}
                {hasFormula && m.formula && (
                  <div
                    role="tooltip"
                    className={`absolute right-0 top-full mt-2 w-64 sm:w-72 rounded-xl border border-slate-600/60 bg-charcoal-900/95 p-3.5 shadow-2xl backdrop-blur-md z-50 transition-all duration-200 ${
                      isOpen
                        ? 'opacity-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 translate-y-1 pointer-events-none'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-charcoal-600 pb-2">
                      <p className={`font-mono text-xs font-bold ${m.accent}`}>
                        {m.formula.title}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTooltip(null);
                        }}
                        className="rounded p-0.5 text-slate-400 hover:text-slate-200"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-slate-300 font-mono">
                      {m.formula.steps.map((step) => (
                        <p key={step} className="rounded bg-charcoal-800/80 px-2 py-1 border border-charcoal-600/40">
                          {step}
                        </p>
                      ))}
                    </div>

                    {m.formula.note && (
                      <p className="mt-2 text-[10px] text-slate-400 border-t border-charcoal-700/60 pt-1.5">
                        ℹ️ {m.formula.note}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
