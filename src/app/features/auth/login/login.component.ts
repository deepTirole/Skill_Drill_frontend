// ─────────────────────────────────────────────────────────────────────────────
// Skill_Drill — LoginComponent
// ─────────────────────────────────────────────────────────────────────────────

import {
  Component,
  inject,
  NgZone,
  AfterViewInit,
  OnInit,
  ElementRef,
  signal,
  ViewChild,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { AuthService } from "../../../core/services/auth.service";

interface GoogleIdentityApi {
  accounts: {
    id: {
      initialize(config: {
        client_id: string;
        callback: (response: { credential?: string }) => void;
      }): void;
      renderButton(
        element: HTMLElement,
        options: {
          theme: string;
          size: string;
          shape: string;
          width: number;
        },
      ): void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityApi;
  }
}

@Component({
  selector: "app-login",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: "./login.component.html",
})
export class LoginComponent implements OnInit, AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  router = inject(Router);
  route = inject(ActivatedRoute);

  readonly isLoading = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly successMsg = signal<string | null>(null);
  readonly showPassword = signal(false);

  readonly form = this.fb.nonNullable.group({
    username: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required /*Validators.minLength(8)*/]],
  });

  @ViewChild("googleBtn") googleBtn!: ElementRef<HTMLDivElement>;
  readonly googleToken = signal<string | null>(null);

  get email() {
    return this.form.controls.username;
  }
  get password() {
    return this.form.controls.password;
  }

  // login.component.ts
  successMessage = "";

  constructor(private ngZone: NgZone) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params["registered"] === "true") {
        this.successMessage = "Registration successful! Please log in.";
      }
    });
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  ngAfterViewInit(): void {
    this.initializeGoogleButton(0);
  }

  private initializeGoogleButton(attempt: number): void {
    const googleApi = window.google;
    if (googleApi?.accounts?.id) {
      googleApi.accounts.id.initialize({
        client_id:
          "756057668406-vbhglu5h8942nek4k96e5f99kj21vsql.apps.googleusercontent.com",
        callback: (response) =>
          this.ngZone.run(() => this.handleGoogleResponse(response)),
      });

      googleApi.accounts.id.renderButton(this.googleBtn.nativeElement, {
        theme: "filled_black",
        size: "large",
        shape: "rectangular",
        width: 320,
      });
      return;
    }

    if (attempt < 20) {
      setTimeout(() => this.initializeGoogleButton(attempt + 1), 250);
      return;
    }

    this.errorMsg.set(
      "Google Sign-In is unavailable right now. Please use email and password.",
    );
  }

  private handleGoogleResponse(response: { credential?: string }): void {
    const idToken = response.credential;
    if (!idToken) {
      this.errorMsg.set("Google Sign-In did not return a valid credential.");
      return;
    }

    this.isLoading.set(true);
    this.errorMsg.set(null);

    this.auth.loginWithGoogle(idToken).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(["/dashboard"]);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMsg.set(err?.error?.message ?? "Google Sign-In failed.");
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMsg.set(null);

    this.auth.login(this.form.getRawValue()).subscribe({
      next: (res: any) => {
        this.router.navigate(["/dashboard"]);
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.errorMsg.set(
          err?.error?.message ?? "Invalid credentials. Please try again.",
        );
      },
    });
  }
}
