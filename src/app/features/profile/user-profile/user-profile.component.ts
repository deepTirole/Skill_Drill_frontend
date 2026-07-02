import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../shared/models';

// interface UserProfile {
//   id: number;
//   fullname: string;
//   username: string;
//   role: string;
//   rating: number;
//   createdAt: string;
//   userSkills: { id: number; name: string }[];
// }

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './user-profile.component.html',
})
export class ProfileComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly isLoading = signal(true);
  readonly profile   = signal<User | null>(null);

  auth = inject(AuthService);

  readonly initials = computed(() => {
    const name = this.profile()?.fullname ?? '';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0]?.[0]?.toUpperCase() ?? 'U';
  });

  ngOnInit(): void {
    this.profile.set(this.auth.currentState().user);
    this.isLoading.set(false);
  }
}