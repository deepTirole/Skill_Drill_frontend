// ─────────────────────────────────────────────────────────────────────────────
// Skill_Drill — InterviewService
// Manages interview lifecycle state and API interactions
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import {
  BehaviorSubject,
  Observable,
  tap,
  catchError,
  throwError,
  map,
  switchMap,
} from "rxjs";
import {
  Interview,
  QaLog,
  SessionResult,
  HeatmapDay,
  EloDataPoint,
} from "../../shared/models";

interface InterviewSession {
  interview: Interview | null;
  qaLogs: QaLog[];
  currentQaLog: QaLog | null;
  currentIndex: number;
  isLoading: boolean;
  error: string | null;
  answeredIds?: string[];
  timeElapsed?: number;
}

const INITIAL_SESSION: InterviewSession = {
  interview: null,
  qaLogs: [],
  currentQaLog: null,
  currentIndex: 0,
  isLoading: false,
  error: null,
};

@Injectable({ providedIn: "root" })
export class InterviewService {
  private readonly http = inject(HttpClient);
  private readonly BASE = "http://localhost:8080/interview";

  constructor() {
    const saved = sessionStorage.getItem("sd_live_session");
    if (saved) {
      try {
        const parsed: InterviewSession = JSON.parse(saved);
        this._session$.next(parsed);
      } catch {
        sessionStorage.removeItem("sd_live_session");
      }
    }
  }

  // ── Session State ─────────────────────────────────────────────────────────
  private readonly _session$ = new BehaviorSubject<InterviewSession>(
    INITIAL_SESSION,
  );
  readonly session$ = this._session$.asObservable();
  readonly currentQaLog$ = this.session$.pipe(map((s) => s.currentQaLog)); // replaces currentQuestion$
  // progress$ — derive from array
  readonly progress$ = this.session$.pipe(
    map((s) => ({
      current: s.currentIndex + 1, // 1-based for display
      total: s.qaLogs.length,
    })),
  );

  // ── Recent Sessions ───────────────────────────────────────────────────────
  private readonly _sessions$ = new BehaviorSubject<Interview[]>([]);
  readonly sessions$ = this._sessions$.asObservable();

  private patch(partial: Partial<InterviewSession>): void {
    // this._session$.next({ ...this._session$.value, ...partial });
    const next = { ...this._session$.value, ...partial };
    this._session$.next(next);

    // Persist whenever there's an active interview; clear when reset
    if (next.interview) {
      sessionStorage.setItem("sd_live_session", JSON.stringify(next));
    } else {
      sessionStorage.removeItem("sd_live_session");
    }
  }

  updateElapsed(seconds: number): void {
    this.patch({ timeElapsed: seconds });
  }

  // ── Interview Lifecycle ───────────────────────────────────────────────────
  startInterview(role: string): Observable<Interview> {
    this.patch({ isLoading: true, error: null });

    return this.http
      .post<Interview>(
        `${this.BASE}/start`,
        {},
        { params: new HttpParams().set("job-role", role) },
      )
      .pipe(
        switchMap((interview) =>
          this.http.get<QaLog[]>(`${this.BASE}/${interview.id}/questions`).pipe(
            // returns QaLog[]
            map((qaLogs) => ({ interview, qaLogs })),
          ),
        ),
        tap(({ interview, qaLogs }) => {
          const sorted = [...qaLogs].sort(
            (a, b) => Number(a.id) - Number(b.id),
          );
          this.patch({
            interview,
            qaLogs: sorted,
            currentQaLog: sorted[0] ?? null,
            currentIndex: 0,
            isLoading: false,
          });
        }),
        map(({ interview }) => interview),
        catchError((err) => {
          this.patch({
            isLoading: false,
            error: err?.error?.message ?? "Failed to start interview",
          });
          return throwError(() => err);
        }),
      );
  }

  submitAnswer(answer: string): Observable<string> {
    // ← returns string now
    const { currentQaLog, currentIndex, qaLogs } = this._session$.value;
    if (!currentQaLog) return throwError(() => new Error("No active session"));

    this.patch({ isLoading: true });
    return this.http
      .post(
        `${this.BASE}/user-response`, // send qaLogId in URL or body
        { qaLogId: currentQaLog.id, userResponse: answer }, // match AnswerSubmitDTO fields
        { responseType: "text" },
      )
      .pipe(
        tap(() => {
          // Mark current log as answered locally — don't wait for AI feedback
          const updatedLogs = qaLogs.map((log, i) =>
            i === currentIndex
              ? { ...log, userAnswer: answer } // optimistic update
              : log,
          );
          this.patch({ qaLogs: updatedLogs, isLoading: false });
        }),
        catchError((err) => {
          this.patch({
            isLoading: false,
            error: err?.error?.message ?? "Failed to submit answer",
          });
          return throwError(() => err);
        }),
      );
  }

  // nextQuestion() — increment index, pick from array
  nextQuestion(): void {
    const { qaLogs, currentIndex } = this._session$.value;
    const nextIndex = currentIndex + 1;
    const nextQaLog = qaLogs[nextIndex] ?? null;
    if (!nextQaLog) return;

    this.patch({
      currentIndex: nextIndex,
      currentQaLog: nextQaLog,
    });
  }

  finalizeSession(lastAnswer: string): Observable<SessionResult> {
    const { interview, currentQaLog } = this._session$.value;
    if (!interview || !currentQaLog)
      return throwError(() => new Error("No active session"));

    return this.http
      .post<SessionResult>(`${this.BASE}/${interview.id}/finalize`, {
        qaLogId: currentQaLog.id,
        userResponse: lastAnswer, // AnswerSubmitDTO fields
      })
      .pipe(
        tap(() => this.patch(INITIAL_SESSION)),
        catchError((err) => throwError(() => err)),
      );
  }

  // ── Historical Data ───────────────────────────────────────────────────────
  fetchUserSessions(): Observable<Interview[]> {
    return this.http
      .get<Interview[]>(`${this.BASE}/my-sessions`)
      .pipe(tap((sessions) => this._sessions$.next(sessions)));
  }

  fetchHeatmap(): Observable<HeatmapDay[]> {
    return this.http.get<HeatmapDay[]>(`${this.BASE}/heatmap`);
  }

  fetchEloHistory(): Observable<EloDataPoint[]> {
    return this.http.get<EloDataPoint[]>(`${this.BASE}/elo-history`);
  }

  fetchSessionResult(interviewId: string): Observable<SessionResult> {
    return this.http.get<SessionResult>(`${this.BASE}/${interviewId}/result`);
  }
}
