// ─────────────────────────────────────────────────────────────────────────────
// Skill_Drill — Application Routes
// ─────────────────────────────────────────────────────────────────────────────

import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // ── Public Landing ────────────────────────────────────────────────────────
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component').then(m => m.HomeComponent),
  },

  // ── Auth Feature ──────────────────────────────────────────────────────────
  {
    path: 'auth',
    canActivate: [guestGuard],
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login.component').then(m => m.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register/register.component').then(m => m.RegisterComponent),
      },
      {
        path: 'verify-otp',
        loadComponent: () =>
          import('./features/auth/otp-verify/otp-verify.component').then(m => m.OtpVerifyComponent),
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },

  // ── Dashboard ─────────────────────────────────────────────────────────────
  {
    path: 'dashboard',
    canActivate:[authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },

  // ── Interview — /interview and /interview/:id both load the same component
  {
    path: 'interview',
    canActivate:[authGuard],
    loadComponent: () =>
      import('./features/interview/interview.component').then(m => m.InterviewComponent),
  },
  {
    path: 'interview/:id',
    canActivate:[authGuard],
    loadComponent: () =>
      import('./features/interview/interview.component').then(m => m.InterviewComponent),
  },

  // ── Analytics ─────────────────────────────────────────────────────────────
  {
    path: 'analytics/:interviewId',
    canActivate:[authGuard],
    loadComponent: () =>
      import('./features/analytics/analytics.component').then(m => m.AnalyticsComponent),
  },

  // ── Fallback ──────────────────────────────────────────────────────────────
  { path: '**', redirectTo: '' },
];
