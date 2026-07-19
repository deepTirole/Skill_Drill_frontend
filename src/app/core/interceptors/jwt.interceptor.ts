// ─────────────────────────────────────────────────────────────────────────────
// Skill_Drill — Cookie-Based HttpInterceptor (Functional, inject-driven)
// Ensures credentials/cookies are attached to outgoing API requests
// ─────────────────────────────────────────────────────────────────────────────

import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Functional Cookie interceptor.
 * Registered in app.config.ts via withInterceptors([cookieInterceptor]).
 */
export const cookieInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const authService = inject(AuthService);
  const router      = inject(Router);

  // 1. Force the browser to include HttpOnly cookies with the outgoing request
  const outgoing = req.clone({
    withCredentials: true
  });

  return next(outgoing).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        if (err.status === 401) {
          // Cookie is either missing, expired, or rejected by the backend.
          // Trigger the local UI state cleanup.
          authService.clearLocalState(); 
          router.navigate(['/auth/login'], {
            queryParams: { reason: 'session_expired' },
          });
        }
        if (err.status === 403) {
          router.navigate(['/']);
        }
      }
      return throwError(() => err);
    })
  );
};