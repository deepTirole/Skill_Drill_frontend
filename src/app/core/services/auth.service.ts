// ─────────────────────────────────────────────────────────────────────────────
// Skill_Drill — AuthService (Cookie-Based Auth Refactor)
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, inject, signal, computed } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Router } from "@angular/router";
import {
  BehaviorSubject,
  Observable,
  tap,
  catchError,
  throwError,
  map,
} from "rxjs";
import {
  AuthState,
  AuthCredentials,
  RegisterPayload,
  OtpPayload,
  User,
  OtpResponse,
  ResetPassword,
} from "../../shared/models";

// Token no longer lives in the response body/localStorage — the backend sets
// it as an HttpOnly cookie. We only care about the user profile now.
interface AuthResponse {
  user: User;
}

const INITIAL_STATE: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
};

// Still fine to cache non-sensitive profile data for a snappier initial paint.
// This is NOT the source of truth for auth — it's just a UI cache. The real
// auth check happens against the server (see note below on rehydration).
const USER_KEY = "sd_user";

@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly BASE = "http://localhost:8080/auth";
  private readonly BASE_USER = "http://localhost:8080/user";

  // ── Single Source of Truth State Stream ────────────────────────────────────
  private readonly _state$ = new BehaviorSubject<AuthState>(
    this.rehydrateFromCache(),
  );
  readonly state$ = this._state$.asObservable();

  // RxJS Selectors for legacy/streaming components
  readonly user$ = this.state$.pipe(map((s) => s.user));
  readonly isAuth$ = this.state$.pipe(map((s) => s.isAuthenticated));

  // Modern Angular Signals linked directly to the Single Source of Truth
  readonly currentState = signal<AuthState>(this._state$.value);
  readonly isAuthenticated = computed(
    () => this.currentState().isAuthenticated,
  );
  readonly currentUser = computed(() => this.currentState().user);

  constructor() {
    // Sync the stream state with our signals whenever it emits a mutation
    this.state$.subscribe((state) => this.currentState.set(state));
  }

  // ── State Mutators & Hydration ─────────────────────────────────────────────
  private patch(partial: Partial<AuthState>): void {
    this._state$.next({ ...this._state$.value, ...partial });
  }

  /**
   * Optimistic, cache-only hydration. We can no longer decode a JWT to check
   * expiry client-side (it's an HttpOnly cookie now — invisible to JS), so
   * this ONLY seeds the UI with a cached user profile to avoid a flash of
   * "logged out" state. It does NOT guarantee the session is actually valid.
   *
   * The real check is server-side: call fetchMe() on app bootstrap (e.g. an
   * APP_INITIALIZER or a root guard) to confirm the cookie is still valid.
   * If that call 401s, the interceptor will call clearLocalState() for you.
   */
  private rehydrateFromCache(): AuthState {
    try {
      const rawUser = localStorage.getItem(USER_KEY);
      if (rawUser) {
        return {
          user: JSON.parse(rawUser),
          token: null,
          isAuthenticated: true,
          isLoading: false,
        };
      }
    } catch (e) {
      /* Browser storage sandbox restriction or corrupted JSON string */
    }
    return INITIAL_STATE;
  }

  private persistUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  private clearUserCache(): void {
    localStorage.removeItem(USER_KEY);
  }

  get userId(): string | null {
    return this._state$.value.user?.id || null;
  }

  // ── Auth Operations ───────────────────────────────────────────────────────
  login(credentials: AuthCredentials): Observable<AuthResponse> {
    this.patch({ isLoading: true });
    return this.http
      .post<AuthResponse>(`${this.BASE}/login`, credentials, {
        withCredentials: true, // let the browser store the Set-Cookie response
      })
      .pipe(
        tap(({ user }) => {
          this.persistUser(user);
          this.patch({ user, isAuthenticated: true, isLoading: false });
        }),
        catchError((err) => {
          this.patch({ isLoading: false });
          return throwError(() => err);
        }),
      );
  }

  register(payload: RegisterPayload): Observable<{ message: string }> {
    this.patch({ isLoading: true });
    return this.http
      .post<{ message: string }>(`${this.BASE}/register`, payload)
      .pipe(
        tap(() => {
          this.patch({ isLoading: false });
          this.router.navigate(["/auth/verify-otp"], {
            queryParams: { email: payload.username },
          });
        }),
        catchError((err) => {
          this.patch({ isLoading: false });
          return throwError(() => err);
        }),
      );
  }

  sendOtp(email: string): Observable<OtpResponse> {
    return this.http.get<OtpResponse>("http://localhost:8080/mail/send-otp", {
      params: new HttpParams().set("email", email),
    });
  }

  verifyOtp(payload: OtpPayload): Observable<{ message: string }> {
    this.patch({ isLoading: true });
    return this.http.post<{ message: string }>(
      "http://localhost:8080/mail/verify-otp",
      payload,
    );
  }

  resendOtp(email: string): Observable<OtpResponse> {
    return this.http.post<OtpResponse>(
      "http://localhost:8080/mail/resend-otp",
      email,
    );
  }

  // Forgot password methods

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.get<{ message: string }>(`${this.BASE}/forget-password`, {
      params: new HttpParams().set("email", email),
    });
  }

  resetPassword(payload: ResetPassword): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.BASE}/reset-password`,
      payload,
    );
  }

  fetchMe(): Observable<User> {
    return this.http
      .get<User>(`${this.BASE_USER}/get_user`, { withCredentials: true })
      .pipe(
        tap((user) => {
          this.persistUser(user);
          this.patch({ user, isAuthenticated: true });
        }),
        catchError((err) => throwError(() => err)),
      );
  }

  // --------Update Methods---------------------------------------------------

  updateName(payload: { fullname: string }): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.BASE_USER}/update`, payload);
  }

  updatePassword(payload: {
    currentPassword: string;
    newPassword: string;
  }): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.BASE_USER}/update`, payload);
  }

  updateEmail(payload: {
    password: string;
    email: string;
  }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.BASE_USER}/update-email`,
      payload,
    );
  }

  completeEmailUpdate(payload: {
    email: string;
    otp: string;
  }): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.BASE_USER}/complete-email-update`, payload, {
        withCredentials: true,
      })
      .pipe(
        tap(({ user }) => {
          this.persistUser(user);
          this.patch({ user, isAuthenticated: true, isLoading: false });
        }),
        catchError((err) => {
          this.patch({ isLoading: false });
          return throwError(() => err);
        }),
      );
  }

  // -----------User Utility Methods---------------------------------------------------

  updateRating(newRating: number): void {
    const user = this._state$.value.user;
    if (!user) return;
    const updated = { ...user, rating: newRating };
    this.persistUser(updated);
    this.patch({ user: updated });
  }

  /**
   * Synchronous, local-only reset of frontend auth state. Makes NO network
   * call — this is exactly what the 401 interceptor should call so a dead
   * cookie can't trigger an infinite retry loop (a logout() HTTP call from
   * inside a 401 handler could itself 401 and re-trigger the interceptor).
   */
  clearLocalState(): void {
    this.clearUserCache();
    this._state$.next(INITIAL_STATE);
  }

  /**
   * Full logout: asks the backend to clear the HttpOnly cookie, then resets
   * local state and redirects — regardless of whether the request succeeds,
   * so the user is never stuck "logged in" on the client if the network call
   * fails.
   */
  logout(): void {
    this.http
      .post(`${this.BASE}/logout`, {}, { withCredentials: true })
      .pipe(
        catchError((err) => {
          // Server call failed (network issue, already-expired cookie, etc.)
          // — still proceed to clear local state below.
          return throwError(() => err);
        }),
      )
      .subscribe({
        next: () => this.finishLogout(),
        error: () => this.finishLogout(),
      });
  }

  private finishLogout(): void {
    this.clearLocalState();
    this.router.navigate(["/auth/login"]);
  }
}