// ─────────────────────────────────────────────────────────────────────────────
// Skill_Drill — OtpInputComponent
// Segmented 6-digit numeric OTP input with auto-advance & paste support
// ─────────────────────────────────────────────────────────────────────────────

import {
  Component, EventEmitter, Output, ViewChildren,
  QueryList, ElementRef, OnInit, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'sd-otp-input',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './otp-input.component.html',
})
export class OtpInputComponent implements OnInit {
  @Output() otpComplete = new EventEmitter<string>();
  @Output() otpChange   = new EventEmitter<string>();

  @ViewChildren('digitInput') digitInputs!: QueryList<ElementRef<HTMLInputElement>>;

  readonly digits = signal<string[]>(Array(6).fill(''));
  readonly OTP_LENGTH = 6;

  ngOnInit(): void {}

  onInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(-1); // only last numeric char

    const current = [...this.digits()];
    current[index] = value;
    this.digits.set(current);
    this.emitChange();

    if (value && index < this.OTP_LENGTH - 1) {
      this.focusAt(index + 1);
    }

    if (current.every(d => d !== '')) {
      this.otpComplete.emit(current.join(''));
    }
  }

  onKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace') {
      const current = [...this.digits()];
      if (current[index]) {
        current[index] = '';
        this.digits.set(current);
        this.emitChange();
      } else if (index > 0) {
        current[index - 1] = '';
        this.digits.set(current);
        this.emitChange();
        this.focusAt(index - 1);
      }
      event.preventDefault();
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      this.focusAt(index - 1);
    }
    if (event.key === 'ArrowRight' && index < this.OTP_LENGTH - 1) {
      this.focusAt(index + 1);
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text')?.replace(/\D/g, '') ?? '';
    if (!pasted) return;

    const chars = pasted.slice(0, this.OTP_LENGTH).split('');
    const current = Array(this.OTP_LENGTH).fill('');
    chars.forEach((c, i) => { current[i] = c; });
    this.digits.set(current);
    this.emitChange();

    const lastFilledIndex = Math.min(chars.length - 1, this.OTP_LENGTH - 1);
    this.focusAt(lastFilledIndex);

    if (current.every(d => d !== '')) {
      this.otpComplete.emit(current.join(''));
    }
  }

  onFocus(index: number, event: FocusEvent): void {
    (event.target as HTMLInputElement).select();
  }

  private focusAt(index: number): void {
    const inputs = this.digitInputs.toArray();
    inputs[index]?.nativeElement?.focus();
  }

  private emitChange(): void {
    this.otpChange.emit(this.digits().join(''));
  }

  getValue(): string {
    return this.digits().join('');
  }

  reset(): void {
    this.digits.set(Array(6).fill(''));
    this.focusAt(0);
  }
}
