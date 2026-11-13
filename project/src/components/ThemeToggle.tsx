import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

export type ThemePreference = 'system' | 'light' | 'dark';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemePreference>(() => {
    try {
      const saved = localStorage.getItem('kses-theme') as ThemePreference | null;
      return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
    } catch {
      return 'system';
    }
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      const isDark = theme === 'dark' || (theme === 'system' && mediaQuery.matches);

      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
    };

    apply();
    try {
      localStorage.setItem('kses-theme', theme);
    } catch {
      // Ignore localStorage errors
    }

    const onMediaChange = () => {
      if (theme === 'system') apply();
    };

    mediaQuery.addEventListener('change', onMediaChange);
    return () => mediaQuery.removeEventListener('change', onMediaChange);
  }, [theme]);

  return (
    <div
      role="group"
      aria-label="Theme Selection"
      className="flex items-center rounded-lg border border-slate-700/60 bg-charcoal-800/90 p-0.5 text-[11px] font-mono shadow-sm backdrop-blur"
    >
      <button
        type="button"
        title="โหมดสว่าง (Light Mode)"
        onClick={() => setTheme('light')}
        className={`flex items-center gap-1 rounded-md px-2 py-1 transition-all ${
          theme === 'light'
            ? 'bg-amber-500/20 text-amber-400 font-bold shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Sun className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Light</span>
      </button>

      <button
        type="button"
        title="โหมดมืด (Dark Mode)"
        onClick={() => setTheme('dark')}
        className={`flex items-center gap-1 rounded-md px-2 py-1 transition-all ${
          theme === 'dark'
            ? 'bg-kmitl-orange/20 text-kmitl-orange-light font-bold shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Moon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Dark</span>
      </button>

      <button
        type="button"
        title="อิงตามอุปกรณ์ (System Auto)"
        onClick={() => setTheme('system')}
        className={`flex items-center gap-1 rounded-md px-2 py-1 transition-all ${
          theme === 'system'
            ? 'bg-sky-500/20 text-sky-400 font-bold shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Monitor className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Auto</span>
      </button>
    </div>
  );
}
