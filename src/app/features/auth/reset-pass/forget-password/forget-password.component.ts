import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forget-password.component.html',
})
export class ForgotPasswordComponent {
  private readonly fb   = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  readonly isLoading  = signal(false);
  readonly successMsg = signal<string | null>(null);
  readonly errorMsg   = signal<string | null>(null);

  private auth = inject(AuthService)

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.successMsg.set(null);
    this.errorMsg.set(null);

    this.auth.forgotPassword(this.form.getRawValue().email).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.successMsg.set(res?.message ??'Reset link sent! Check your inbox.');
        this.form.reset();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMsg.set(err?.message ?? 'Something went wrong. Try again.');
      },
    });
  }
}