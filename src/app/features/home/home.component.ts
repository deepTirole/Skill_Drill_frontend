// ─────────────────────────────────────────────────────────────────────────────
// Skill_Drill — HomeComponent (Public Landing Page)
// ─────────────────────────────────────────────────────────────────────────────

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { AuthService } from '../../core/services/auth.service';

interface FeatureCard {
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  protected readonly auth  = inject(AuthService);
  readonly isAuth$ = this.auth.isAuth$;

  readonly stats = [
    { value: '12,400+', label: 'Engineers trained' },
    { value: '94%',     label: 'Interview pass rate' },
    { value: '340ms',   label: 'Avg. AI response time' },
    { value: '4.9★',    label: 'Average rating' },
  ];

  readonly features: FeatureCard[] = [
    {
      icon: 'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v11m0 0h10m-10 0a2 2 0 01-2 2H5a2 2 0 01-2-2v-4m12 6h4a2 2 0 002-2v-4m0 0H9',
      title: 'AI-Powered Questions',
      description: 'Dynamically generated from your resume, role, and current Elo rating. No two sessions are alike.',
    },
    {
      icon: 'M13 10V3L4 14h7v7l9-11h-7z',
      title: 'Real-time Elo Ranking',
      description: 'Your skill rating evolves after every session. Track your progression curve like a competitive player.',
    },
    {
      icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
      title: 'Deep Critique Engine',
      description: 'Every answer receives structured feedback: accuracy score, depth analysis, and targeted improvement vectors.',
    },
    {
      icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
      title: 'Resume Intelligence',
      description: 'Upload your resume and the engine extracts keywords, maps proficiency, and aligns question difficulty.',
    },
  ];
}
