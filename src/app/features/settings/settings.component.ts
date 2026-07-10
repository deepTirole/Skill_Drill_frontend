import { Component, inject, OnInit, signal } from "@angular/core";
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { AuthService } from "../../core/services/auth.service";
import { NavbarComponent } from "../../shared/components/navbar/navbar.component";
import { NavbarDropdownComponent } from "../../shared/components/navbar/navbar-dropdown/navbar-dropdown.component";

@Component({
  selector: "app-settings",
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NavbarComponent,
    NavbarDropdownComponent,
  ],
  templateUrl: "./settings.component.html",
})
export class SettingsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly successMsg = signal<string | null>(null);
  readonly emailError = signal<string | null>(null);
  readonly passwordError = signal<string | null>(null);
  readonly passwordSuccess = signal<string | null>(null);

  readonly nameLoading = signal(false);
  readonly emailLoading = signal(false);
  readonly passwordLoading = signal(false);

  readonly showCurrent = signal(false);
  readonly showNew = signal(false);
  readonly showEmailPassword = signal(false);

  readonly nameForm = this.fb.nonNullable.group({
    fullname: ["", Validators.required],
  });

  readonly emailForm = this.fb.nonNullable.group({
    password: ["", Validators.required],
    email: ["", [Validators.required, Validators.email]],
  });

  readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ["", Validators.required],
    newPassword: ["", [Validators.required, Validators.minLength(8)]],
  });

  ngOnInit(): void {
    this.http
      .get<{ fullname: string; username: string }>("/api/users/me")
      .subscribe({
        next: (user) => {
          this.nameForm.patchValue({ fullname: user.fullname });
          this.emailForm.patchValue({ email: user.username });
        },
      });
  }

  toggleShowCurrent(): void {
    this.showCurrent.update((v) => !v);
  }

  toggleShowNew(): void {
    this.showNew.update((v) => !v);
  }

  toggleShowEmailPassword(): void {
    this.showEmailPassword.update((v) => !v);
  }

  private showSuccess(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(null), 3000);
  }

  updateName(): void {
    if (this.nameForm.invalid) {
      this.nameForm.markAllAsTouched();
      return;
    }
    this.nameLoading.set(true);
    this.auth.updateName(this.nameForm.getRawValue()).subscribe({
      next: () => {
        this.nameLoading.set(false);
        this.showSuccess("Name updated.");
      },
      error: (err) => {
        this.nameLoading.set(false);
        this.nameForm.setErrors(
          err?.error?.errors ?? { update: "Failed to update name." },
        );
      },
    });
  }

  updateEmail(): void {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }
    this.emailLoading.set(true);
    this.emailError.set(null);
    this.auth.updateEmail(this.emailForm.getRawValue()).subscribe({
      next: (res) => {
        this.emailLoading.set(false);
        this.router.navigate(["/verify-otp"], {
          queryParams: {
            email: this.emailForm.get("email")?.value,
            context: "update-email",
          },
        });
        this.emailForm.patchValue({ password: "" });
      },
      error: (err) => {
        this.emailLoading.set(false);
        this.emailError.set(
          err?.error?.message ??
            "Current password is incorrect or that email is already in use.",
        );
      },
    });
  }

  updatePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.passwordLoading.set(true);
    this.passwordError.set(null);
    this.passwordSuccess.set(null);
    this.auth.updatePassword(this.passwordForm.getRawValue()).subscribe({
      next: () => {
        this.passwordLoading.set(false);
        this.passwordForm.reset();
        // this.auth.clearSession();
        // this.router.navigate(["/auth/login"], {
        //   queryParams: { reason: "password_updated" },
        // });
      },
      error: (err) => {
        this.passwordLoading.set(false);
        this.passwordError.set(
          err?.error?.message ?? "Current password is incorrect.",
        );
      },
    });
  }

  confirmDelete(): void {
    const confirmed = window.confirm(
      "Are you sure? This will permanently delete your account and all your data.",
    );
    if (!confirmed) return;
    this.http.delete("/api/users/me").subscribe({
      next: () => {
        this.auth.logout();
        this.router.navigate(["/auth/login"]);
      },
    });
  }
}