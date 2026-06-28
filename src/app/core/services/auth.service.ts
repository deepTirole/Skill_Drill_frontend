// ─────────────────────────────────────────────────────────────────────────────
// Skill_Drill — AuthService (Refactored & Unified)
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
import { jwtDecode } from "jwt-decode";
import {
  AuthState,
  AuthCredentials,
  RegisterPayload,
  OtpPayload,
  User,
  OtpResponse,
} from "../../shared/models";

interface AuthResponse {
  token: string;
  user: User;
}

const INITIAL_STATE: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
};

const TOKEN_KEY = "sd_auth_token";
const USER_KEY = "sd_user";

@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly BASE = "http://localhost:8080/auth";
  private readonly BASE_USER = "http://localhost:8080/user";

  // ── Single Source of Truth State Stream ────────────────────────────────────
  private readonly _state$ = new BehaviorSubject<AuthState>(
    this.rehydrateAndValidate(),
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
   * Reads storage and strictly ensures the token is present AND unexpired.
   * Wipes stale details immediately if the session has lapsed.
   */
  private rehydrateAndValidate(): AuthState {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const rawUser = localStorage.getItem(USER_KEY);

      if (token && rawUser) {
        // Active Expiration Inspection via jwt-decode
        const decoded: any = jwtDecode(token);
        const currentTimestamp = Math.floor(Date.now() / 1000);

        if (decoded.exp && decoded.exp > currentTimestamp) {
          return {
            user: JSON.parse(rawUser),
            token,
            isAuthenticated: true,
            isLoading: false,
          };
        }
      }
    } catch (e) {
      /* Browser storage sandbox restriction or corrupted JSON string */
    }

    // Token is either absent, malformed, or older than 30 minutes. Clear storage out.
    this.clearStorage();
    return INITIAL_STATE;
  }

  private persist(token: string, user: User): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  private clearStorage(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  getToken(): string | null {
    return this._state$.value.token;
  }

  get userId(): string | null {
    return this._state$.value.user?.id || null;
  }

  // ── Auth Operations ───────────────────────────────────────────────────────
  login(credentials: AuthCredentials): Observable<AuthResponse> {
    this.patch({ isLoading: true });
    return this.http.post<AuthResponse>(`${this.BASE}/login`, credentials).pipe(
      tap(({ token, user }) => {
        // console.log(token);
        
        this.persist(token, user);
        this.patch({ token, user, isAuthenticated: true, isLoading: false });
        // console.log(this._state$.value.token);
        
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

  sendOtp(email: string) : Observable<OtpResponse> {
    return this.http.get<OtpResponse>("http://localhost:8080/mail/send-otp", {
      params: new HttpParams().set("email", email),
    });
  }

  verifyOtp(payload: OtpPayload): Observable<{ message: string }> {-
    this.patch({ isLoading: true });
    return this.http
      .post<{message : string}>("http://localhost:8080/mail/verify-otp", payload)
  }

  resendOtp(email: string): Observable<OtpResponse> {
    return this.http.post<OtpResponse>("http://localhost:8080/mail/resend-otp", email);
  }

  fetchMe(): Observable<User> {
    return this.http.get<User>(`${this.BASE_USER}/get_user`).pipe(
      tap((user) => {
        this.persist(this._state$.value.token!, user);
        this.patch({ user });
      }),
      catchError((err) => throwError(() => err)),
    );
  }

  updateRating(newRating: number): void {
    const user = this._state$.value.user;
    if (!user) return;
    const updated = { ...user, rating: newRating };
    this.persist(this._state$.value.token!, updated);
    this.patch({ user: updated });
  }

  logout(): void {
    this.clearStorage();
    this._state$.next(INITIAL_STATE);
    this.router.navigate(["/"]);
  }
}
