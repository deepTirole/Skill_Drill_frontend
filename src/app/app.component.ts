// ─────────────────────────────────────────────────────────────────────────────
// Skill_Drill — Root AppComponent
// ─────────────────────────────────────────────────────────────────────────────

import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class AppComponent implements OnInit {
  // Eagerly inject ThemeService so the effect() runs and sets the initial theme class
  private readonly themeService = inject(ThemeService);
  protected readonly Math = Math

  ngOnInit(): void {
    // Theme is initialized via ThemeService signal effect in constructor
  }
}
