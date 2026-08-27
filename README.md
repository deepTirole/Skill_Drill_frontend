# Skill_Drill — AI Mock Interview Engine
### Angular 18+ · Tailwind CSS · Standalone Components · RxJS

---

## Project Structure

```
skill-drill/
├── angular.json                          # Angular workspace config
├── package.json                          # Dependencies (Angular 18 + Tailwind 3)
├── tailwind.config.js                    # Tailwind: darkMode: 'class', custom tokens
├── postcss.config.js                     # PostCSS for Tailwind
├── tsconfig.json                         # Strict TypeScript config (ES2022)
├── tsconfig.app.json
│
└── src/
    ├── index.html                        # Anti-FOUC theme script inline
    ├── main.ts                           # bootstrapApplication entry
    ├── styles.css                        # Tailwind directives + DM Sans font + scan animation
    │
    └── app/
        ├── app.component.ts              # Root shell — eagerly boots ThemeService
        ├── app.config.ts                 # provideHttpClient + withInterceptors([jwtInterceptor])
        ├── app.routes.ts                 # Lazy-loaded routes with authGuard / guestGuard
        │
        ├── core/
        │   ├── guards/
        │   │   └── auth.guard.ts         # authGuard + guestGuard (functional CanActivateFn)
        │   ├── interceptors/
        │   │   └── jwt.interceptor.ts    # Functional JWT interceptor (inject() — no circular DI)
        │   └── services/
        │       ├── auth.service.ts       # BehaviorSubject<AuthState>, login/register/otp/logout
        │       ├── interview.service.ts  # Session lifecycle, progress$, qaLogs, heatmap, elo
        │       ├── resume.service.ts     # Upload with HttpEventType progress, keyword management
        │       └── theme.service.ts      # Signal-based dark/light toggle, localStorage persist
        │
        ├── shared/
        │   ├── models/
        │   │   └── index.ts              # All TypeScript interfaces (User, Interview, QaLog, etc.)
        │   └── components/
        │       ├── navbar/
        │       │   ├── navbar.component.ts   # Auth-state CTA, theme toggle, nav links
        │       │   └── navbar.component.html # Fixed top-center nav with dark/light classes
        │       └── otp-input/
        │           ├── otp-input.component.ts   # Auto-advance, backspace, paste, focus logic
        │           └── otp-input.component.html # 6 segmented boxes with Tailwind focus rings
        │
        └── features/
            ├── home/
            │   ├── home.component.ts     # Landing page: stats, features array
            │   └── home.component.html   # Hero, asymmetric grid, stats strip, feature cards
            │
            ├── auth/
            │   ├── login/
            │   │   ├── login.component.ts     # ReactiveForm, error state, password toggle
            │   │   └── login.component.html   # Split-panel: dark left brand / right form
            │   ├── register/
            │   │   ├── register.component.ts  # Cross-field password match validator
            │   │   └── register.component.html # Step indicator, full form, consent text
            │   └── otp-verify/
            │       ├── otp-verify.component.ts  # 60s countdown, resend, ViewChild reset
            │       └── otp-verify.component.html # OTP widget integration + resend timer
            │
            ├── dashboard/
            │   ├── dashboard.component.ts     # Drag-drop, resume upload, heatmap gen, Elo
            │   └── dashboard.component.html   # Grid: resume zone, keywords, heatmap, profile
            │
            ├── interview/
            │   ├── interview.component.ts     # Submit/next logic, mic toggle, timer, session state
            │   └── interview.component.html   # Progress bar, question card, textarea, nav controls
            │
            └── analytics/
                ├── analytics.component.ts     # SessionResult display, score color, mock fallback
                └── analytics.component.html   # Score cards grid, expandable QA critique log
```

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm start
# → http://localhost:4200
```

---
