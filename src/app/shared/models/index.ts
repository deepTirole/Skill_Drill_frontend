// ─────────────────────────────────────────────────────────────────────────────
// Skill_Drill — Core TypeScript Interfaces
// Mirrors a Spring Boot JPA relational data model
// ─────────────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  fullname: string;
  // avatarUrl?: string;
  rating: number;
  createdAt: string; // ISO 8601
  // resumeUrl?: string;
  role: string;
  isVerified: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface RegisterPayload {
  fullname: string;
  username: string;
  password: string;
}

export interface OtpPayload {
  email: string;
  otp: string; // 6-digit code
}

export interface OtpResponse {
  message: string;
  success: boolean;
}

export interface ResetPassword {
  token: string;
  password: string;
}

export interface Interview {
  id: number;
  userId: string;
  jobRole: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  totalQuestions: number;
  currentQuestion: number;
  sessionScore?: number;     // 0–10
  eloChange?: number;
  createdAt: string;
  completedAt?: string;
  startTime?: string;
  completionTime?: string;
}

export interface Question {
  id: string;
  interviewId: string;
  index: number;
  prompt: string;
  category: string;          // e.g. "Algorithms", "System Design"
  expectedTopics: string[];
}

export interface QaLog {
  id: number;
  interviewId: string;
  questionIndex: number;
  question: string;
  userAnswer: string;
  aiCritique: AiCritique;
}

export interface AiCritique {
  score: number;             // 0–10
  clarity: number;           // 0–10
  depth: number;             // 0–10
  accuracy: number;          // 0–10
  feedbackLines: string[];
  missingTopics: string[];
  strengths: string[];
}

export interface Keyword {
  id: string;
  userId: string;
  skillName: string;
  proficiency: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  source: 'RESUME' | 'MANUAL';
}

export interface HeatmapDay {
  date: string;              // YYYY-MM-DD
  count: number;             // number of interview sessions
}

export interface EloDataPoint {
  date: string;
  rating: number;
}

export interface ResumeUploadState {
  status: 'IDLE' | 'DRAGGING' | 'UPLOADING' | 'PROCESSING' | 'COMPLETE' | 'ERROR';
  fileName?: string;
  progress?: number;
  errorMessage?: string;
  uploadedAt?: Date;
}

export interface SessionResult {
  interview: Interview;
  qaLogs: QaLog[];
  finalScore: number;
  eloChange: number;
  newElo: number;
  timeSpentSeconds: number;
  role: string;
}
