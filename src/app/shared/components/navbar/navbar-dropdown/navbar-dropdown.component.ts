import { Component, computed, ElementRef, HostListener, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-navbar-dropdown',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './navbar-dropdown.component.html',
})
export class NavbarDropdownComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly auth   = inject(AuthService);
  private readonly elRef  = inject(ElementRef);

  readonly isOpen         = signal(false);
  readonly isDark         = signal(true);
  readonly showAppearance = signal(false);

  readonly fullName = signal('');
  readonly email    = signal('');

  readonly firstName = computed(() => this.fullName().split(' ')[0]);

  private appearanceTimer: ReturnType<typeof setTimeout> | null = null;

  readonly initials = computed(() => {
    const parts = this.fullName().trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0]?.[0]?.toUpperCase() ?? 'U';
  });

  ngOnInit(): void {
    const user = this.auth.currentUser();
    this.fullName.set(user?.fullname  ?? 'User');
    this.email.set(user?.username ?? '');

    const saved = localStorage.getItem('theme');
    const dark  = saved ? saved === 'dark' : true;
    this.isDark.set(dark);
    this.applyTheme(dark);
  }

  toggleDropdown(): void {
    this.isOpen.update(v => !v);
    if (!this.isOpen()) this.showAppearance.set(false);
  }

  close(): void {
    this.isOpen.set(false);
    this.showAppearance.set(false);
  }

  setTheme(mode: 'light' | 'dark'): void {
    const dark = mode === 'dark';
    this.isDark.set(dark);
    this.applyTheme(dark);
    localStorage.setItem('theme', mode);
    this.showAppearance.set(false);
  }

  private applyTheme(dark: boolean): void {
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }

  showAppearanceMenu(): void {
    if(this.appearanceTimer) {
      clearTimeout(this.appearanceTimer);
      this.appearanceTimer = null;
    }
    this.showAppearance.set(true);
  }

  hideAppearanceMenu(): void {
    this.appearanceTimer = setTimeout(() => {
      this.showAppearance.set(false);
      this.appearanceTimer = null;
    }, 300);
  }
  
  logout(): void {
    this.close();
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
      this.showAppearance.set(false);
    }
  }
}