// ─────────────────────────────────────────────────────────────────────────────
// Skill_Drill — AboutComponent
// Project overview, mission statement, and architectural tech stack display.
// ─────────────────────────────────────────────────────────────────────────────

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from "../../components/navbar/navbar.component";

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './about.component.html'
})
export class AboutComponent {
  
  // Data array for clean HTML rendering
  readonly features = [
    {
      title: 'AI Interview Engine',
      description: 'Powered by Spring AI and Gemini 3.1 Flash, our engine generates dynamic, role-specific questions based on the candidate\'s actual skillset.',
      icon: 'M13 10V3L4 14h7v7l9-11h-7z' // Lightning bolt
    },
    {
      title: 'Smart Resume Parsing',
      description: 'Utilizing Apache Tika, the platform instantly ingests PDF resumes, extracting key technical proficiencies to customize the interview difficulty.',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' // Document
    },
    {
      title: 'Dynamic Elo Progression',
      description: 'A custom, non-linear Elo rating algorithm with Variable K-Factors accurately tracks user progression and prevents rating inflation.',
      icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' // Trending up
    },
    {
      title: 'Stateless Security',
      description: 'Enterprise-grade architecture featuring strict JWT (JSON Web Token) signature verification and OTP-based transactional integrity.',
      icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' // Lock
    }
  ];

  readonly techStack = [
    { name: 'Java 21', category: 'Core Backend' },
    { name: 'Spring Boot 3.x', category: 'Framework' },
    { name: 'Angular 17+', category: 'Frontend' },
    { name: 'PostgreSQL', category: 'Database' },
    { name: 'Spring Security & JWT', category: 'Authentication' },
    { name: 'Tailwind CSS', category: 'Styling' }
  ];
}