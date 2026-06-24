// ─────────────────────────────────────────────────────────────────────────────
// Skill_Drill — ThemeService
// Manages dark/light mode toggle, persisted to localStorage
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, signal, computed, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);

  // ── Signal-based theme state ──────────────────────────────────────────────
  private readonly _theme = signal<Theme>(this.initialTheme());
  readonly theme   = this._theme.asReadonly();
  readonly isDark  = computed(() => this._theme() === 'dark');

  constructor() {
    // Sync class on <html> element whenever theme changes
    effect(() => {
      if (isPlatformBrowser(this.platformId)) {
        const root = document.documentElement;
        if (this._theme() === 'dark') {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
        localStorage.setItem('sd_theme', this._theme());
      }
    });
  }

  toggle(): void {
    this._theme.update(t => (t === 'dark' ? 'light' : 'dark'));
  }

  set(theme: Theme): void {
    this._theme.set(theme);
  }

  private initialTheme(): Theme {
    if (!isPlatformBrowser(this.platformId)) return 'dark';
    const stored = localStorage.getItem('sd_theme') as Theme | null;
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
