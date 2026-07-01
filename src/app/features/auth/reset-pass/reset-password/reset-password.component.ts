import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../core/services/auth.service';

function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const pw  = group.get('password')?.value;
  const cpw = group.get('confirmPassword')?.value;
  return pw === cpw ? null : { mismatch: true };
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './reset-password.component.html',
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly http   = inject(HttpClient);
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private token = '';

  readonly isLoading    = signal(false);
  readonly successMsg   = signal<string | null>(null);
  readonly errorMsg     = signal<string | null>(null);
  readonly tokenMissing = signal(false);
  readonly showPassword = signal(false);
  readonly showConfirm  = signal(false);
  readonly strengthScore = signal(0);

  private auth = inject(AuthService);

  readonly reqs = signal({ length: false, upper: false, number: false, symbol: false });

  readonly strengthLabel = computed(() => {
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    return labels[this.strengthScore()] ?? '';
  });

  readonly requirements = [
    { key: 'length', label: '8+ chars' },
    { key: 'upper',  label: 'Uppercase' },
    { key: 'number', label: 'Number' },
    { key: 'symbol', label: 'Symbol' },
  ] as const;

  readonly form = this.fb.nonNullable.group(
    {
      password:        ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator }
  );

  ngOnInit(): void {
    this.errorMsg.set(null);
    this.successMsg.set(null);
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) this.tokenMissing.set(true);
  }

  checkStrength(): void {
    const val = this.form.get('password')?.value ?? '';
    const updated = {
      length: val.length >= 8,
      upper:  /[A-Z]/.test(val),
      number: /[0-9]/.test(val),
      symbol: /[^A-Za-z0-9]/.test(val),
    };
    this.reqs.set(updated);
    this.strengthScore.set(Object.values(updated).filter(Boolean).length);
  }

  getBarColor(index: number): string {
    if (this.strengthScore() < index) return 'var(--border-subtle)';
    const colors = ['', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e'];
    return colors[this.strengthScore()];
  }

  togglePassword() {
  this.showPassword.update(v => !v);
}

toggleConfirm() {
  this.showConfirm.update(v => !v);
}

  onSubmit(): void {
    if (this.form.invalid || this.tokenMissing()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMsg.set(null);

    const { password } = this.form.getRawValue();
    console.log(password);
    this.auth.resetPassword({ token: this.token, password }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMsg.set('Password updated! You Can Close This Window Now');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMsg.set(err?.error?.message);
        setTimeout(() => this.router.navigate(['/reset-password']), 1500);
      },
    });
  }
}