// ─────────────────────────────────────────────────────────────────────────────
// Skill_Drill — RegisterComponent
// ─────────────────────────────────────────────────────────────────────────────

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password        = control.get('password');
  const confirmPassword = control.get('confirmPassword');
  if (password && confirmPassword && password.value !== confirmPassword.value) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private readonly fb   = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly isLoading    = signal(false);
  readonly errorMsg     = signal<string | null>(null);
  readonly showPassword = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      fullname:        ['', [Validators.required, Validators.minLength(2)]],
      username:           ['', [Validators.required, Validators.email]],
      password:        ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator }
  );

  get fullname()        { return this.form.controls.fullname; }
  get username()           { return this.form.controls.username; }
  get password()        { return this.form.controls.password; }
  get confirmPassword() { return this.form.controls.confirmPassword; }

  get passwordsMatch(): boolean {
    return !this.form.errors?.['passwordMismatch'];
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMsg.set(null);

    const { fullname, username, password } = this.form.getRawValue();
    this.auth.register({ fullname, username, password }).subscribe({
      error: (err) => {
        this.isLoading.set(false);
        this.errorMsg.set(err?.error?.message ?? 'Registration failed. Please try again.');
      }
    });
  }
}
