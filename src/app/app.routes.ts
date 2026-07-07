// ─────────────────────────────────────────────────────────────────────────────
// Skill_Drill — Application Routes
// ─────────────────────────────────────────────────────────────────────────────

import { Routes } from "@angular/router";
import { authGuard, guestGuard } from "./core/guards/auth.guard";

export const routes: Routes = [
  // ── Public Landing ────────────────────────────────────────────────────────
  {
    path: "",
    loadComponent: () =>
      import("./features/home/home.component").then((m) => m.HomeComponent),
  },

  {
    path: "home",
    loadComponent: () =>
      import("./features/home/home.component").then((m) => m.HomeComponent),
  },

  {
    path: "forgot-password",
    loadComponent: () =>
      import("./features/auth/reset-pass/forget-password/forget-password.component").then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: "reset-password",
    loadComponent: () =>
      import("./features/auth/reset-pass/reset-password/reset-password.component").then(
        (m) => m.ResetPasswordComponent,
      ),
  },

  // ── Auth Feature ──────────────────────────────────────────────────────────
  {
    path: "auth",
    canActivate: [guestGuard],
    children: [
      {
        path: "login",
        loadComponent: () =>
          import("./features/auth/login/login.component").then(
            (m) => m.LoginComponent,
          ),
      },
      {
        path: "register",
        loadComponent: () =>
          import("./features/auth/register/register.component").then(
            (m) => m.RegisterComponent,
          ),
      },
      {
        path: "verify-otp",
        loadComponent: () =>
          import("./features/auth/otp-verify/otp-verify.component").then(
            (m) => m.OtpVerifyComponent,
          ),
      },

      {
        path: "",
        loadComponent: () =>
          import("./shared/additional/not-found/not-found.component").then(
            (m) => m.NotFoundComponent,
          ),
        pathMatch: "full",
      },
    ],
  },

  // ── Dashboard ─────────────────────────────────────────────────────────────
  {
    path: "dashboard",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/dashboard/dashboard.component").then(
        (m) => m.DashboardComponent,
      ),
  },

  // ── User profile ─────────────────────────────────────────────────────────────
  {
    path: "profile",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/profile/user-profile/user-profile.component").then(
        (m) => m.ProfileComponent,
      ),
  },

  // ── User profile settings ─────────────────────────────────────────────────────────────
  {
    path: "settings",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/settings/settings.component").then(
        (m) => m.SettingsComponent,
      ),
  },

  // ── User History ─────────────────────────────────────────────────────────────
  {
    path: "history",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/analytics/interview-histroy/interview-histroy.component").then(
        (m) => m.HistoryComponent,
      ),
  },

  // ── Interview — /interview and /interview/:id both load the same component
  {
    path: "interview",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/interview/interview.component").then(
        (m) => m.InterviewComponent,
      ),
  },
  {
    path: "interview/:id",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/interview/interview.component").then(
        (m) => m.InterviewComponent,
      ),
  },

  // ── Analytics ─────────────────────────────────────────────────────────────
  {
    path: "analytics/:interviewId",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/analytics/analytics.component").then(
        (m) => m.AnalyticsComponent,
      ),
  },

  //_____ about ─────────────────────────────────────────────────────────────
  {
    path: "about",
    loadComponent: () =>
      import("./shared/additional/about/about.component").then(
        (m) => m.AboutComponent,
      ),
  },

  //_____ Not Found / 404 ─────────────────────────────────────────────────────────────
  {
    path: "not-found",
    loadComponent: () =>
      import("./shared/additional/not-found/not-found.component").then(
        (m) => m.NotFoundComponent,
      ),
  },

  // ── Fallback ──────────────────────────────────────────────────────────────
  {
    path: "**",
    loadComponent: () =>
      import("./shared/additional/not-found/not-found.component").then(
        (m) => m.NotFoundComponent,
      ),
  },
];