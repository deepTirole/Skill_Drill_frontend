// ─────────────────────────────────────────────────────────────────────────────
// Skill_Drill — LoginComponent
// ─────────────────────────────────────────────────────────────────────────────

import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {
  private readonly fb   = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  router = inject(Router)
  route = inject(ActivatedRoute)

  readonly isLoading   = signal(false);
  readonly errorMsg    = signal<string | null>(null);
  readonly successMsg   = signal<string | null>(null);
  readonly showPassword = signal(false);

  readonly form = this.fb.nonNullable.group({
    username:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, /*Validators.minLength(8)*/]],
  });

  get email()    { return this.form.controls.username; }
  get password() { return this.form.controls.password; }

  // login.component.ts
successMessage = '';

ngOnInit() {
  this.route.queryParams.subscribe(params => {
    if (params['registered'] === 'true') {
      this.successMessage = 'Registration successful! Please log in.';
    }
  });
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

    this.auth.login(this.form.getRawValue()).subscribe({
      next: (res:any) => {
        this.router.navigate(['/dashboard'])
      },
      error: (err:any) => {
        this.isLoading.set(false);
        this.errorMsg.set(err?.error?.message ?? 'Invalid credentials. Please try again.');
      }
    });
  }
}

