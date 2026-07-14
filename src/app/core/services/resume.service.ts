// ─────────────────────────────────────────────────────────────────────────────
// Skill_Drill — ResumeService
// Handles resume upload, processing state, and keyword extraction
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEventType, HttpRequest } from '@angular/common/http';
import { BehaviorSubject, Observable, of, tap, catchError, throwError, filter, map } from 'rxjs';
import { Keyword, ResumeUploadState } from '../../shared/models';
import { AuthService } from './auth.service';
import { RatingPoint } from '../../features/interview/ratingpoint/ratingpoint.component';

export interface ResumeMetaDto {
  filename: string;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class ResumeService {
  private readonly http = inject(HttpClient);
  private readonly BASE = 'http://localhost:8080/resume';

  authService = inject(AuthService);
  
  // ── Upload State ──────────────────────────────────────────────────────────
  private readonly _uploadState$ = new BehaviorSubject<ResumeUploadState>({ status: 'IDLE' });
  readonly uploadState$ = this._uploadState$.asObservable();

  // ── Keywords ──────────────────────────────────────────────────────────────
  private readonly _keywords$ = new BehaviorSubject<Keyword[]>([]);
  readonly keywords$ = this._keywords$.asObservable();

  // ── Rating history ──────────────────────────────────────────────────────────────
  private readonly _ratingHistory$ = new BehaviorSubject<RatingPoint[]>([]);
  readonly ratingHistory$ = this._ratingHistory$.asObservable();

  // ── Fetch Resume Metadata (call on dashboard init) ────────────────────────
  fetchResumeMeta(): Observable<ResumeMetaDto | null> {
    return this.http.get<ResumeMetaDto>(`${this.BASE}/get-resume`).pipe(
      tap(meta => {
        if (meta?.filename) {
          this._uploadState$.next({
            status: 'COMPLETE',
            fileName: meta.filename,
            uploadedAt: new Date(meta.timestamp),
            progress: 100,
          });
        }
      }),
      catchError(() => {
        // No resume found or user never uploaded — leave state as IDLE
        return of(null);
      })
    );
  }

  fetchRatingHistory(): Observable<RatingPoint[]> {
  return this.http.get<RatingPoint[]>('http://localhost:8080/user/get_sessions').pipe(
    tap(history => this._ratingHistory$.next(history)),
    catchError(() => of([]))
  );
}

  // ── Upload with Progress ──────────────────────────────────────────────────
  uploadResume(file: File): Observable<number> {
    this._uploadState$.next({ status: 'UPLOADING', fileName: file.name, progress: 0 });

    const formData = new FormData();
    const userId = this.authService.userId
    if(!userId)
      throw new Error('Cannot upload resume: No authenticated user session was located.');

    formData.append('file', file);
    formData.append('user_id', userId)

    const req = new HttpRequest('POST', `${this.BASE}/upload`, formData, {
      reportProgress: true,
    });

    return this.http.request(req).pipe(
      tap(event => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          const progress = Math.round((event.loaded / event.total) * 100);
          this._uploadState$.next({ status: 'UPLOADING', fileName: file.name, progress });
          if (progress === 100) {
            this._uploadState$.next({ status: 'PROCESSING', fileName: file.name, progress: 100 });
          }
        }
        if (event.type === HttpEventType.Response) {
          const keywords = (event.body as { keywords: Keyword[] })?.keywords ?? [];
          this._keywords$.next(keywords);
          this._uploadState$.next({
            status: 'COMPLETE',
            fileName: file.name,
            uploadedAt: new Date(),
            progress: 100,
          });
        }
      }),
      filter(event => event.type === HttpEventType.UploadProgress),
      map(event => {
        const e = event as { loaded: number; total?: number };
        return e.total ? Math.round((e.loaded / e.total) * 100) : 0;
      }),
      catchError(err => {
        this._uploadState$.next({
          status: 'ERROR',
          fileName: file.name,
          errorMessage: err?.error?.message ?? 'Upload failed. Please try again.',
        });
        return throwError(() => err);
      })
    );
  }

  fetchKeywords(): Observable<Keyword[]> {
    return this.http.get<Keyword[]>(`${this.BASE}/get_user_skills`).pipe(
      tap(keywords => this._keywords$.next(keywords))
    );
  }

  resetUploadState(): void {
    this._uploadState$.next({ status: 'IDLE' });
  }

  addKeyword(label: string): Observable<Keyword> {
    return this.http.post<Keyword>(`${this.BASE}/keywords`, {
      label,
      source: 'MANUAL',
      proficiency: 'INTERMEDIATE',
    }).pipe(
      tap(keyword => this._keywords$.next([...this._keywords$.value, keyword]))
    );
  }

  removeKeyword(id: string): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/keywords/${id}`).pipe(
      tap(() => this._keywords$.next(this._keywords$.value.filter(k => k.id !== id)))
    );
  }
}