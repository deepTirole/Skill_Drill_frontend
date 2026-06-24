// ─────────────────────────────────────────────────────────────────────────────
// Skill_Drill — AnalyticsComponent
// Post-session scorecard, Elo delta, and structured QA critique log
// ─────────────────────────────────────────────────────────────────────────────

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { InterviewService } from '../../core/services/interview.service';
import { SessionResult } from '../../shared/models';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent],
  templateUrl: './analytics.component.html',
})
export class AnalyticsComponent implements OnInit {
  private readonly interviewSvc = inject(InterviewService);
  private readonly route        = inject(ActivatedRoute);
  private readonly router       = inject(Router);
  protected readonly Math       = Math;

  readonly result      = signal<SessionResult | null>(null);
  readonly isLoading   = signal(true);
  readonly hasFailed   = signal(false);
  readonly expandedLog = signal<number | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('interviewId') ?? '';

    if (!id) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.interviewSvc.fetchSessionResult(id).subscribe({
      next:  r  => { this.result.set(r); this.isLoading.set(false); },
      error: () => { this.isLoading.set(false); this.hasFailed.set(true); },
    });
  }

  toggleLog(id: number): void {
    this.expandedLog.update(cur => cur === id ? null : id);
  }

  startNew(): void { this.router.navigate(['/dashboard']); }

  // ── Display helpers ────────────────────────────────────────────────────────
  get scoreColor(): string {
    const s = this.result()?.finalScore ?? 0;
    return s >= 8 ? 'text-emerald-500' : s >= 6 ? 'text-amber-500' : 'text-red-500';
  }

  get scoreLabel(): string {
    const s = this.result()?.finalScore ?? 0;
    if (s >= 9) return 'Exceptional';
    if (s >= 8) return 'Strong';
    if (s >= 7) return 'Competent';
    if (s >= 6) return 'Developing';
    return 'Needs Work';
  }

  get eloChangeColor(): string {
    return (this.result()?.eloChange ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-500';
  }

  get formattedTime(): string {
  const start     = this.result()?.interview?.startTime;
  const completed = this.result()?.interview?.completionTime;
  if (!start || !completed) return '—';
  const secs = Math.floor(
    (new Date(completed).getTime() - new Date(start).getTime()) / 1000
  );
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

  metricColor(v: number): string {
    return v >= 8 ? 'var(--accent-emerald)' : v >= 6 ? '#f59e0b' : '#ef4444';
  }
}