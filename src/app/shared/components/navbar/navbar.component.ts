// ─────────────────────────────────────────────────────────────────────────────
// Skill_Drill — NavbarComponent
// Top-centered global navigation with auth-state-driven CTA
// ─────────────────────────────────────────────────────────────────────────────

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'sd-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent {
  protected readonly auth  = inject(AuthService);
  protected readonly theme = inject(ThemeService);

  readonly isAuth$  = this.auth.isAuth$;
  readonly isDark   = this.theme.isDark;

  toggleTheme(): void {
    this.theme.toggle();
  }

  logout(): void {
    this.auth.logout();
  }

  navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Pricing',  href: '#pricing'  },
    { label: 'About',    href: '#about'    },
  ];
}
