// ─────────────────────────────────────────────────────────────────────────────
// Skill_Drill — DashboardComponent
// Authenticated dashboard with resume upload, profile, heatmap, keywords
// ─────────────────────────────────────────────────────────────────────────────

import {
  Component, inject, OnInit, signal,
  ElementRef, ViewChild
} from '@angular/core';
import { CommonModule, SlicePipe } from "@angular/common";
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ResumeService } from '../../core/services/resume.service';
import { InterviewService } from '../../core/services/interview.service';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { Keyword, HeatmapDay, EloDataPoint, Interview } from '../../shared/models';
import { RatingGraphComponent } from '../interview/ratingpoint/ratingpoint.component';

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SlicePipe, RouterLink, NavbarComponent, RatingGraphComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly auth      = inject(AuthService);
  private readonly resume    = inject(ResumeService);
  private readonly interview = inject(InterviewService);
  private readonly router    = inject(Router);

  @ViewChild('dropZone') dropZoneRef!: ElementRef<HTMLDivElement>;

  readonly user$          = this.auth.user$;
  readonly uploadState$   = this.resume.uploadState$;
  readonly keywords$      = this.resume.keywords$;
  readonly sessions$      = this.interview.sessions$;
  readonly ratingHistory$ = this.resume.ratingHistory$;

  readonly heatmapData = signal<HeatmapDay[]>(this.generateMockHeatmap());
  readonly eloHistory  = signal<EloDataPoint[]>(this.generateMockElo());
  readonly sessions    = signal<Interview[]>([]);
  readonly isDragging  = signal(false);

  readonly selectedRole      = signal<string>('');
  readonly isStartingSession = signal(false);

  readonly jobRoles: string[] = [
    'Java Developer',
    'Python Developer',
    'Frontend Developer',
    'Backend Developer',
    'Full Stack Developer',
    'React Developer',
    'Angular Developer',
    'Spring Boot Developer',
    'DevOps Engineer',
    'Data Analyst',
    'Machine Learning Engineer',
    'Android Developer',
    'Node.js Developer',
    'Cloud Engineer',
    'QA Engineer',
  ];

  protected readonly Math = Math;

  ngOnInit(): void {
    this.auth.fetchMe().subscribe();
    this.resume.fetchKeywords().subscribe();
    this.resume.fetchResumeMeta().subscribe();
    this.resume.fetchRatingHistory().subscribe();
  }

  // ── Drag & Drop ──────────────────────────────────────────────────────────
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(): void {
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.handleFile(file);
  }

  onFileInput(event: Event): void {
    const file = (event.target as HTMLInputElement)?.files?.[0];
    if (file) this.handleFile(file);
  }

  private handleFile(file: File): void {
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file.');
      return;
    }
    this.resume.uploadResume(file).subscribe();
  }

  // ── Interview Start ──────────────────────────────────────────────────────
  startInterview(role: string = ''): void {
    if (!role) return;
    this.isStartingSession.set(true);

    // Derive difficulty automatically from Elo rating
    const rating = this.auth.currentUser()?.rating ?? 1000;
    // const difficulty: Difficulty =
    //   rating < 1050 ? 'EASY'   :
    //   rating < 1150 ? 'MEDIUM' :
    //   rating < 1300 ? 'HARD'   : 'EXPERT';

    this.interview.startInterview(role).subscribe({
      next: (interview) => {
        this.isStartingSession.set(false);
        this.router.navigate(['/interview', interview.id]);
      },
      error: () => this.isStartingSession.set(false),
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  heatIntensity(count: number): string {
    if (count === 0) return 'bg-stone-100 dark:bg-white/[0.04]';
    if (count === 1) return 'bg-stone-300 dark:bg-white/20';
    if (count === 2) return 'bg-stone-500 dark:bg-white/40';
    if (count === 3) return 'bg-stone-700 dark:bg-white/60';
    return 'bg-stone-900 dark:bg-white';
  }

  proficiencyColor(proficiency: Keyword['proficiency']): string {
    const map: Record<string, string> = {
      BEGINNER:     'border-stone-200 dark:border-white/10 text-stone-500 dark:text-stone-400',
      INTERMEDIATE: 'border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400',
      ADVANCED:     'border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
      EXPERT:       'border-purple-200 dark:border-purple-500/30 text-purple-600 dark:text-purple-400',
    };
    return map[proficiency] ?? '';
  }

  // ── Mock data generators ─────────────────────────────────────────────────
  private generateMockHeatmap(): HeatmapDay[] {
    const days: HeatmapDay[] = [];
    for (let i = 0; i < 364; i++) {
      days.push({
        date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
        count: Math.random() < 0.3 ? Math.floor(Math.random() * 4) + 1 : 0,
      });
    }
    return days.reverse();
  }

  private generateMockElo(): EloDataPoint[] {
    let elo = 1200;
    return Array.from({ length: 30 }, (_, i) => {
      elo += Math.floor((Math.random() - 0.35) * 40);
      return {
        date: new Date(Date.now() - (30 - i) * 86400000).toISOString().split('T')[0],
        rating: Math.max(800, elo),
      };
    });
  }
}