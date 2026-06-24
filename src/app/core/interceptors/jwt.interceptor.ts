// ─────────────────────────────────────────────────────────────────────────────
// Skill_Drill — JWT HttpInterceptor (Functional, inject-driven)
// Attaches Bearer token to outgoing requests; avoids circular DI
// ─────────────────────────────────────────────────────────────────────────────

import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** List of endpoints that must NOT receive the Authorization header */
const PUBLIC_ENDPOINTS = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/verify-otp',
  '/api/v1/auth/resend-otp',
];

function isPublic(url: string): boolean {
  return PUBLIC_ENDPOINTS.some(e => url.includes(e));
}

function cloneWithBearer(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });
}

/**
 * Functional JWT interceptor.
 * Registered in app.config.ts via withInterceptors([jwtInterceptor]).
 * Uses inject() directly — no service instantiation in constructor,
 * preventing the HttpClient → AuthService → HttpClient circular loop.
 */
export const jwtInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  // Use inject() here rather than injecting into a class constructor
  const authService = inject(AuthService);
  const router      = inject(Router);

  const token = authService.getToken();

  // console.log('Interceptor fired:', req.url);
  // console.log('Token:', token);
  // console.log('Is public:', isPublic(req.url));

  // Skip token attachment for public auth endpoints
  const outgoing = (token && !isPublic(req.url))
    ? cloneWithBearer(req, token)
    : req;

  return next(outgoing).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        if (err.status === 401) {
          // Token expired or invalid — force logout and redirect
          authService.logout();
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
