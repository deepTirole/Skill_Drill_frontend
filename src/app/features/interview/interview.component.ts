// ─────────────────────────────────────────────────────────────────────────────
// Skill_Drill — InterviewComponent
// Stage-driven rendering. Backend-connected — no mock data.
// Speech synthesis auto-reads each question aloud on load.
// Voice input (SpeechRecognition) auto-types transcript into answer field.
// ─────────────────────────────────────────────────────────────────────────────

import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  ViewChild,
  ElementRef,
  NgZone,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from "@angular/forms";
import { Router, ActivatedRoute } from "@angular/router";
import { InterviewService } from "../../core/services/interview.service";
import { QaLog, Interview } from "../../shared/models";
import { Subscription } from "rxjs";

type RecordingState = "IDLE" | "RECORDING";
type SessionStage = "CONNECTING" | "READY" | "ACTIVE" | "ERROR";

// ── Web Speech API types ────────────────────────────────────────────────────
// Not part of standard lib.dom.d.ts — declared locally so this file has no
// dependency on @types/dom-speech-recognition or similar being installed.
interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult:
    | ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void)
    | null;
  onerror:
    | ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void)
    | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

// Extend Window to include browser-(un)prefixed SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

@Component({
  selector: "app-interview",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: "./interview.component.html",
})
export class InterviewComponent implements OnInit, OnDestroy {
  private readonly interviewSvc = inject(InterviewService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly ngZone = inject(NgZone);

  @ViewChild("responseArea") responseAreaRef!: ElementRef<HTMLTextAreaElement>;

  // ── View data ────────────────────────────────────────────────────────────
  interview = signal<Interview | null>(null);
  currentLog = signal<QaLog | null>(null);

  // ── Stage tracking ───────────────────────────────────────────────────────
  readonly stage = signal<SessionStage>("CONNECTING");
  readonly stageMessages: Record<
    SessionStage,
    { title: string; detail: string }
  > = {
    CONNECTING: {
      title: "Connecting to session…",
      detail: "Please wait while we load your interview.",
    },
    READY: {
      title: "Session ready",
      detail: "Your interview is about to begin. Good luck!",
    },
    ACTIVE: { title: "", detail: "" },
    ERROR: {
      title: "Something went wrong",
      detail:
        "Unable to load the interview session. Please go back and try again.",
    },
  };

  // ── UI state ─────────────────────────────────────────────────────────────
  readonly recordingState = signal<RecordingState>("IDLE");
  readonly isSubmitting = signal(false);
  readonly isSpeaking = signal(false);
  readonly timeElapsed = signal(0);
  readonly answeredIndices = signal(new Set<string>()); // tracks by QaLog.id

  // ── Speech recognition state ──────────────────────────────────────────────
  readonly interimTranscript = signal<string>(""); // live partial result
  readonly speechSupported = signal(false); // browser capability flag
  readonly voiceError = signal<string | null>(null); // user-facing mic error, if any
  private recognition: SpeechRecognition | null = null;
  private committedText = ""; // snapshot of textarea value before this recording session
  private typingTimer?: ReturnType<typeof setTimeout>;
  private networkRetryCount = 0;
  private static readonly MAX_NETWORK_RETRIES = 2;

  // ── Reactive form ────────────────────────────────────────────────────────
  answerForm!: FormGroup;
  readonly wordCount = signal(0);

  private timerInterval?: ReturnType<typeof setInterval>;
  private subs = new Subscription();

  readonly currentIndex = signal(0);
  readonly totalQuestions = signal(0);

  // ──────────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    // 1. Build form
    this.answerForm = this.fb.group({
      response: ["", [Validators.required, Validators.minLength(3)]],
    });
    this.answerForm
      .get("response")!
      .valueChanges.subscribe((v: string | null) =>
        this.wordCount.set(
          (v ?? "").trim().split(/\s+/).filter(Boolean).length,
        ),
      );

    // 2. Detect SpeechRecognition support
    const SpeechRecognitionCtor: SpeechRecognitionConstructor | undefined =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    this.speechSupported.set(!!SpeechRecognitionCtor);

    if (SpeechRecognitionCtor) {
      this.recognition = new SpeechRecognitionCtor();
      this.recognition.continuous = true; // keep listening until stopped
      this.recognition.interimResults = true; // stream partial results
      this.recognition.lang = "en-US";
      this.recognition.maxAlternatives = 1;

      // ── Result handler ──────────────────────────────────────────────────
      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = "";
        let finalChunk = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalChunk += transcript + " ";
          } else {
            interim += transcript;
          }
        }

        this.ngZone.run(() => {
          // A successful result proves the connection is healthy again
          this.networkRetryCount = 0;
          if (this.voiceError()) this.voiceError.set(null);

          // Show live ghost text
          this.interimTranscript.set(interim);

          // Append confirmed chunk to textarea with animated typing
          if (finalChunk) {
            const existing =
              (this.answerForm.get("response")!.value as string) ?? "";
            const base = existing.trimEnd();
            const toAdd = (base ? " " : "") + finalChunk.trim();
            this.animateType(base, toAdd);
            this.committedText = (base + toAdd).trimEnd();
          }
        });
      };

      // ── End / error handlers ────────────────────────────────────────────
      // NOTE on ordering: when an error like 'no-speech' occurs, the browser
      // fires onerror FIRST and then onend right after. We must not treat
      // recoverable errors as session-enders here — onend is what decides
      // whether to restart, based purely on recordingState. If onerror were
      // to flip recordingState to IDLE, the mic would die after every short
      // pause (which is exactly the "closes after 1-2 sec" symptom).
      this.recognition.onend = () => {
        this.ngZone.run(() => {
          // If still in RECORDING state the browser stopped on its own
          // (silence timeout, no-speech, brief network hiccup, etc.) —
          // restart automatically so listening continues uninterrupted.
          if (this.recordingState() === "RECORDING") {
            try {
              this.recognition!.start();
            } catch {
              // start() can throw if called while already starting — retry
              // shortly rather than killing the session outright.
              setTimeout(() => {
                if (this.recordingState() === "RECORDING") {
                  try {
                    this.recognition!.start();
                  } catch {
                    this.stopRecording();
                  }
                }
              }, 250);
            }
          }
        });
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        this.ngZone.run(() => {
          // Recoverable / expected conditions — do NOT stop recording.
          // onend will fire next and auto-restart since we're still RECORDING.
          const recoverable = new Set([
            "no-speech", // user paused — very common, not a real error
            "aborted", // we called stop()/abort() ourselves
            "audio-capture", // transient mic hiccup, often recoverable
          ]);
          if (recoverable.has(event.error)) {
            return;
          }

          if (event.error === "network") {
            // Often a transient blip talking to the recognition backend —
            // give it a couple of quick retries before giving up. onend's
            // restart logic will fire next; we just cap how many times
            // we let that happen for this specific error before bailing
            // with a clear message instead of looking "stuck".
            this.networkRetryCount++;
            if (
              this.networkRetryCount <= InterviewComponent.MAX_NETWORK_RETRIES
            ) {
              console.warn(
                `SpeechRecognition network error — retrying (${this.networkRetryCount}/${InterviewComponent.MAX_NETWORK_RETRIES})`,
              );
              return; // let onend's auto-restart try again
            }
            this.voiceError.set(
              "Voice input lost its connection. Check your internet and tap the mic to try again.",
            );
            this.stopRecording();
            return;
          }

          if (
            event.error === "not-allowed" ||
            event.error === "service-not-allowed"
          ) {
            this.voiceError.set(
              "Microphone access was blocked. Allow microphone permission for this site and try again.",
            );
            this.stopRecording();
            return;
          }

          // Any other non-recoverable error
          console.warn("SpeechRecognition error:", event.error);
          this.voiceError.set(
            "Voice input stopped unexpectedly. Tap the mic to try again.",
          );
          this.stopRecording();
        });
      };
    }

    // 3. Start timer
    let tickCount = 0;
    this.timerInterval = setInterval(() => {
      this.timeElapsed.update((v) => v + 1);
      tickCount++;
      if (tickCount % 5 === 0) {
        // Persist elapsed time every 5s so refresh restores it approximately
        (this.interviewSvc as any)["_session$"] &&
          (this.interviewSvc as any)["patch"]?.({
            timeElapsed: this.timeElapsed(),
          });
      }
    }, 1000);

    // 4. Check if session already exists (navigated here after dashboard start)
    const current = (this.interviewSvc as any)["_session$"].value;
    if (current?.interview) {
      this.interview.set(current.interview);
      this.currentLog.set(current.currentQaLog ?? null);
      this.currentIndex.set(current.currentIndex ?? 0);
      this.totalQuestions.set(current.qaLogs?.length ?? 0);

      // ✅ Restore answered set and timer from persisted session
      if (current.answeredIds?.length) {
        this.answeredIndices.set(new Set(current.answeredIds));
      }
      if (current.timeElapsed) {
        this.timeElapsed.set(current.timeElapsed);
      }

      const initialStage: SessionStage = current.currentQaLog
        ? "ACTIVE"
        : "READY";
      this.stage.set(initialStage);
      if (initialStage === "ACTIVE" && current.currentQaLog) {
        this.speakQuestion(current.currentQaLog.question);
      }
    }

    // 5. Watch live session updates
    const sub = this.interviewSvc.session$.subscribe({
      next: (session) => {
        if (session.error) {
          this.stage.set("ERROR");
          return;
        }

        if (session.isLoading) {
          if (this.stage() !== "ACTIVE") this.stage.set("CONNECTING");
          return;
        }

        if (session.interview) {
          const prevLogId = this.currentLog()?.id;
          this.interview.set(session.interview);
          this.currentLog.set(session.currentQaLog ?? null);
          this.currentIndex.set(session.currentIndex ?? 0);
          this.totalQuestions.set(session.qaLogs.length);

          if (session.interview.id) {
            localStorage.setItem(
              "active_interview_id",
              String(session.interview.id),
            );
          }

          if (session.currentQaLog) {
            this.stage.set("ACTIVE");
            if (session.currentQaLog.id !== prevLogId) {
              // New question — reset voice state and speak
              this.stopRecording();
              this.committedText = "";
              this.interimTranscript.set("");
              this.speakQuestion(session.currentQaLog.question);
            }
          } else if (this.stage() === "CONNECTING") {
            this.stage.set("READY");
          }
        }
      },
    });
    this.subs.add(sub);
  }

  ngOnDestroy(): void {
    clearInterval(this.timerInterval);
    clearTimeout(this.typingTimer);
    window.speechSynthesis?.cancel();
    this.stopRecording();
    this.subs.unsubscribe();
  }

  // ── Computed helpers ──────────────────────────────────────────────────────
  get formattedTime(): string {
    const m = Math.floor(this.timeElapsed() / 60)
      .toString()
      .padStart(2, "0");
    const s = (this.timeElapsed() % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  get totalBubbles(): number[] {
    return Array.from({ length: this.totalQuestions() }, (_, i) => i);
  }

  isAnswered(index: number): boolean {
    return this.answeredIndices().has(String(index));
  }

  isActive(): boolean {
    return this.stage() === "ACTIVE";
  }

  // ── Speech synthesis ──────────────────────────────────────────────────────
  speakQuestion(text: string): void {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    this.isSpeaking.set(true);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.lang = "en-US";
    utterance.onend = () => this.isSpeaking.set(false);
    utterance.onerror = () => this.isSpeaking.set(false);

    window.speechSynthesis.speak(utterance);
  }

  stopSpeaking(): void {
    window.speechSynthesis?.cancel();
    this.isSpeaking.set(false);
  }

  // ── Voice recording ───────────────────────────────────────────────────────

  /** Toggle mic on/off */
  toggleRecording(): void {
    if (this.recordingState() === "RECORDING") {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  // private startRecording(): void {
  //   if (!this.recognition) return;

  //   // Snapshot the current textarea value so we can append to it
  //   this.committedText =
  //     (this.answerForm.get("response")!.value as string ?? "").trimEnd();
  //   this.interimTranscript.set("");
  //   this.networkRetryCount = 0;
  //   this.voiceError.set(null);

  //   // Stop TTS while mic is active to avoid feedback
  //   this.stopSpeaking();

  //   try {
  //     this.recognition.start();
  //     this.recordingState.set("RECORDING");
  //   } catch (err) {
  //     console.warn("Could not start SpeechRecognition:", err);
  //   }
  // }

  //new one
  // interview.component.ts — startRecording()
  private startRecording(): void {
    if (!this.recognition) return;

    this.committedText = (
      (this.answerForm.get("response")!.value as string) ?? ""
    ).trimEnd();
    this.interimTranscript.set("");
    this.networkRetryCount = 0;
    this.voiceError.set(null);
    this.stopSpeaking();

    // ✅ Set state BEFORE start() so onend's restart check is correct
    this.recordingState.set("RECORDING"); // <-- move this up

    try {
      this.recognition.start();
      // removed: this.recordingState.set("RECORDING"); // was here before
    } catch (err) {
      this.recordingState.set("IDLE"); // revert if start() throws
      console.warn("Could not start SpeechRecognition:", err);
    }
  }

  private stopRecording(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // already stopped — ignore
      }
    }
    this.recordingState.set("IDLE");
    this.interimTranscript.set("");
  }

  /**
   * Animate typing `addition` into the textarea one character at a time.
   * `base` is the already-committed prefix — we never re-type that.
   */
  private animateType(base: string, addition: string): void {
    clearTimeout(this.typingTimer);
    let i = 0;
    const CHAR_DELAY_MS = 28; // ~36 chars/sec — feels natural

    const tick = () => {
      if (i > addition.length) return;
      const newValue = base + addition.slice(0, i);
      this.answerForm.get("response")!.setValue(newValue, { emitEvent: true });

      // Keep textarea scrolled to bottom
      const ta = this.responseAreaRef?.nativeElement;
      if (ta) ta.scrollTop = ta.scrollHeight;

      i++;
      this.typingTimer = setTimeout(tick, CHAR_DELAY_MS);
    };

    tick();
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  submitAnswer(): void {
    const answer = (this.answerForm.get("response")!.value as string)?.trim();
    if (!answer || this.isSubmitting() || !this.isActive()) return;

    // Stop any active recording before submitting
    this.stopRecording();

    const isLast = this.currentIndex() + 1 >= this.totalQuestions();
    this.isSubmitting.set(true);

    if (isLast) {
      this.interviewSvc.finalizeSession(answer).subscribe({
        next: (r) => {
          this.isSubmitting.set(false);
          this.answerForm.reset();
          setTimeout(
            () =>
              this.router
                .navigate(["/analytics", r.interview.id])
                .catch(() => this.router.navigate(["/dashboard"])),
            0,
          );
        },
        error: () => {
          this.isSubmitting.set(false);
          this.router.navigate(["/dashboard"]);
        },
      });
      return;
    }

    this.interviewSvc.submitAnswer(answer).subscribe({
      next: () => {
        const updated = new Set(this.answeredIndices());
        updated.add(String(this.currentLog()!.id));
        this.answeredIndices.set(updated);
        this.isSubmitting.set(false);
        this.answerForm.reset();
        this.committedText = "";
      },
      error: () => this.isSubmitting.set(false),
    });
  }

  nextQuestion(): void {
    if (this.currentIndex() + 1 >= this.totalQuestions()) {
      return;
    }
    this.stopSpeaking();
    this.stopRecording();
    this.interviewSvc.nextQuestion();
  }

  abandonSession(): void {
    if (confirm("End this session? Your progress will be saved.")) {
      this.stopSpeaking();
      this.stopRecording();
      this.router.navigate(["/dashboard"]);
    }
  }
}
