// ─────────────────────────────────────────────────────────────────────────────
// Skill_Drill — Route Guards (Functional)
// ─────────────────────────────────────────────────────────────────────────────

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** Protects dashboard/interview routes; redirects to login if unauthenticated */
export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  return auth.isAuth$.pipe(
    take(1),
    map(isAuth => {
      if (isAuth) return true;
      router.navigate(['/auth/login']);
      return false;
    })
  );
};

/** Redirects already-authenticated users away from auth pages */
export const guestGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  return auth.isAuth$.pipe(
    take(1),
    map(isAuth => {
      if (!isAuth) return true;
      router.navigate(['/dashboard']);
      return false;
    })
  );
};
