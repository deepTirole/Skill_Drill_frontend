// ─────────────────────────────────────────────────────────────────────────────
// Skill_Drill — HistoryComponent
// Displays a grid of past mock interviews with real-time local filtering.
// ─────────────────────────────────────────────────────────────────────────────

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InterviewService } from '../../../core/services/interview.service';
import { NavbarComponent } from '../../../shared/components/navbar/navbar.component';
import { Interview } from '../../../shared/models';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './interview-histroy.component.html',
})
export class HistoryComponent implements OnInit {
  private readonly interviewSvc = inject(InterviewService);
  private readonly router = inject(Router);

  // State Signals
  readonly interviews = signal<Interview[]>([]);
  readonly isLoading = signal(true);
  readonly searchQuery = signal('');

  // Computed Signal for instant, client-side search filtering
  readonly filteredInterviews = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const list = this.interviews();
    
    if (!query) return list;
    return list.filter(session => 
      session.jobRole?.toLowerCase().includes(query)
    );
  });

  ngOnInit(): void {
    this.fetchHistory();
  }

  private fetchHistory(): void {
    this.interviewSvc.fetchUserSessions().subscribe({
      next: (data) => {
        this.interviews.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load history', err);
        this.isLoading.set(false);
      }
    });
  }

  viewDetails(interviewId: number): void {
    this.router.navigate(['/analytics', interviewId]);
  }

  // UI Helper for dynamic score colors
  getScoreClass(score: number): string {
    if (score >= 8) return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    if (score >= 6) return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    return 'text-red-400 bg-red-400/10 border-red-400/20';
  }
}