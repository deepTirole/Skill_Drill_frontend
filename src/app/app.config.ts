// ─────────────────────────────────────────────────────────────────────────────
// Skill_Drill — Application Configuration (Standalone)
// Angular 18+ bootstrapApplication config with HTTP + routing setup
// ─────────────────────────────────────────────────────────────────────────────

import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import {
  provideHttpClient,
  withInterceptors,
  withFetch
} from '@angular/common/http';
import { routes } from './app.routes';
import { cookieInterceptor } from './core/interceptors/jwt.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // Zone-based CD with event coalescing for performance
    provideZoneChangeDetection({ eventCoalescing: true }),

    // Router with view transitions (page animations) and input binding
    provideRouter(
      routes,
      withComponentInputBinding(),
      withViewTransitions()
    ),

    // HTTP client with functional JWT interceptor (no circular deps)
    provideHttpClient(
      withFetch(),
      withInterceptors([cookieInterceptor])
    ),
  ],
};
