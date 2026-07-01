// ─────────────────────────────────────────────────────────────────────────────
// Skill_Drill — OtpVerifyComponent
// 6-digit OTP verification page with resend countdown
// ─────────────────────────────────────────────────────────────────────────────

import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  ViewChild,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink, ActivatedRoute, Router } from "@angular/router";
import { OtpInputComponent } from "../../../shared/components/otp-input/otp-input.component";
import { AuthService } from "../../../core/services/auth.service";

@Component({
  selector: "app-otp-verify",
  standalone: true,
  imports: [CommonModule, RouterLink, OtpInputComponent],
  templateUrl: "./otp-verify.component.html",
})
export class OtpVerifyComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private router = inject(Router);

  @ViewChild(OtpInputComponent) otpInputRef?: OtpInputComponent;

  readonly email = signal("");
  readonly otp = signal("");
  readonly isLoading = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly successMsg = signal<string | null>(null);

  // Resend cooldown
  readonly resendCountdown = signal(60);
  readonly canResend = signal(false);
  private countdownTimer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    const emailParam = this.route.snapshot.queryParamMap.get("email") ?? "";
    this.email.set(emailParam);
    // this.sendOtp();
    this.startCountdown();
  }

  ngOnDestroy(): void {
    clearInterval(this.countdownTimer);
  }

  sendOtp() {
    this.auth.sendOtp(this.email()).subscribe({
      next: (res) => {},
      error: (err) => {
        this.errorMsg.set(
          err?.error?.message ?? "Failed to send OTP. Please try again.",
        );
      },
    });
  }

  private startCountdown(): void {
    this.resendCountdown.set(60);
    this.canResend.set(false);
    clearInterval(this.countdownTimer);

    this.countdownTimer = setInterval(() => {
      this.resendCountdown.update((v) => {
        if (v <= 1) {
          clearInterval(this.countdownTimer);
          this.canResend.set(true);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
  }

  onOtpChange(value: string): void {
    this.otp.set(value);
    this.errorMsg.set(null);
  }

  onOtpComplete(value: string): void {
    this.otp.set(value);
    this.submit();
  }

  submit(): void {
    if (this.otp().length !== 6 || this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMsg.set(null);

    this.auth.verifyOtp({ email: this.email(), otp: this.otp() }).subscribe({
      next: (res) => {
        this.successMsg.set(
          "OTP verified successfully! Redirecting to login...",
        );
        setTimeout(() => {
          this.router.navigate(["/auth/login"], {
            queryParams: { registered: true },
          });
        }, 1500);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMsg.set(err?.error?.message ?? "Invalid code. Please try again.");
        this.otpInputRef?.reset();
      },
    });
  }

  resendOtp(): void {
    if (!this.canResend()) return;
    console.log("Resending OTP to...", this.email());
    this.successMsg.set(null);
    this.auth.resendOtp(this.email()).subscribe({
      next: (res) => {
        this.errorMsg.set(null);
        this.successMsg.set(
          res?.message ?? "OTP resent successfully! Please check your email.",
        );
        this.startCountdown();
        this.otpInputRef?.reset();
      },
      error: (err) => {
        this.successMsg.set(null)
        this.errorMsg.set(
          err?.error?.message ?? "Failed to resend. Please try again.",
        );
      },
    });
  }
}
