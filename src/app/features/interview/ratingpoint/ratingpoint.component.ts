// ─────────────────────────────────────────────────────────────────────────────
// Skill_Drill — RatingGraphComponent
// LeetCode-style rating progression chart
// ─────────────────────────────────────────────────────────────────────────────

import {
  Component, Input, OnChanges, ViewChild, ElementRef,
  AfterViewInit, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

export interface RatingPoint {
  date: string;       // ISO datetime from backend
  ratingAfter: number;
}

@Component({
  selector: 'sd-rating-graph',
  standalone: true,
  imports: [CommonModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative w-full" style="height:140px;">

      <!-- Empty state -->
      @if (!data || data.length === 0) {
        <div class="absolute inset-0 flex items-center justify-center">
          <p class="text-xs" style="color:var(--text-tertiary);">
            Complete your first session to track progression
          </p>
        </div>
      }

      <!-- Single point state -->
      @if (data?.length === 1) {
        <div class="absolute inset-0 flex items-center justify-center flex-col gap-1">
          <div class="w-3 h-3 rounded-full" style="background:var(--accent-violet);"></div>
          <p class="text-xs" style="color:var(--text-tertiary);">
            {{ data[0].ratingAfter }} · {{ data[0].date | date:'MMM d' }}
          </p>
        </div>
      }

      <!-- Chart -->
      @if (data && data.length > 1) {
        <svg #chartSvg class="w-full h-full overflow-visible"
             [attr.viewBox]="'0 0 ' + W + ' ' + H"
             preserveAspectRatio="none">

          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--accent-violet)" stop-opacity="0.25"/>
              <stop offset="100%" stop-color="var(--accent-violet)" stop-opacity="0"/>
            </linearGradient>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="var(--accent-cyan)"/>
              <stop offset="100%" stop-color="var(--accent-violet)"/>
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <clipPath id="chartClip">
              <rect [attr.x]="PAD" [attr.y]="PAD" [attr.width]="W - PAD*2" [attr.height]="H - PAD*2"/>
            </clipPath>
          </defs>

          <!-- Area fill -->
          <path [attr.d]="areaPath"
                fill="url(#areaGrad)"
                clip-path="url(#chartClip)"
                class="sd-graph-area"/>

          <!-- Line -->
          <path [attr.d]="linePath"
                fill="none"
                stroke="url(#lineGrad)"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                filter="url(#glow)"
                clip-path="url(#chartClip)"
                class="sd-graph-line"/>

          <!-- Dots + hover targets -->
          @for (pt of points; track pt.date; let i = $index) {
            <g class="sd-graph-dot-group"
               (mouseenter)="hoveredIndex = i"
               (mouseleave)="hoveredIndex = -1">
              <!-- Hit area -->
              <circle [attr.cx]="pt.x" [attr.cy]="pt.y" r="12" fill="transparent"/>
              <!-- Outer ring (visible on hover) -->
              <circle [attr.cx]="pt.x" [attr.cy]="pt.y" r="5"
                      fill="none"
                      stroke="var(--accent-violet)"
                      stroke-width="1.5"
                      [attr.opacity]="hoveredIndex === i ? 1 : 0"
                      style="transition:opacity 0.15s"/>
              <!-- Inner dot -->
              <circle [attr.cx]="pt.x" [attr.cy]="pt.y" r="3"
                      [attr.fill]="hoveredIndex === i ? 'var(--accent-cyan)' : 'var(--accent-violet)'"
                      style="transition:fill 0.15s"/>
            </g>
          }

          <!-- Tooltip -->
          @if (hoveredIndex >= 0 && points[hoveredIndex]; as hp) {
            <g>
              <!-- Vertical rule -->
              <line [attr.x1]="hp.x" [attr.y1]="PAD"
                    [attr.x2]="hp.x" [attr.y2]="H - PAD"
                    stroke="var(--border-subtle)" stroke-width="1" stroke-dasharray="3 3"/>

              <!-- Tooltip box — flip if near right edge -->
              <g [attr.transform]="'translate(' + tooltipX(hp.x) + ',' + (hp.y - 36) + ')'">
                <rect x="-1" y="-1" width="86" height="30" rx="6"
                      fill="var(--bg-surface-alt)"
                      stroke="var(--border-subtle)" stroke-width="1"/>
                <text x="8" y="11" font-size="9" fill="var(--text-tertiary)" font-family="monospace">
                  {{ data[hoveredIndex].date | date:'MMM d · h:mm a' }}
                </text>
                <text x="8" y="23" font-size="11" font-weight="700"
                      fill="var(--accent-violet)" font-family="monospace">
                  {{ data[hoveredIndex].ratingAfter }}
                  <tspan font-size="9" font-weight="500"
                         [attr.fill]="ratingDelta(hoveredIndex) >= 0 ? 'var(--accent-emerald)' : '#f87171'">
                    {{ ratingDelta(hoveredIndex) >= 0 ? '+' : '' }}{{ ratingDelta(hoveredIndex) }}
                  </tspan>
                </text>
              </g>
            </g>
          }
        </svg>
      }
    </div>
  `,
  styles: [`
    .sd-graph-area { transition: opacity 0.3s; }
    .sd-graph-line { stroke-dasharray: 1000; stroke-dashoffset: 1000; animation: drawLine 1s ease forwards; }
    @keyframes drawLine { to { stroke-dashoffset: 0; } }
    .sd-graph-dot-group { cursor: default; }
  `]
})
export class RatingGraphComponent implements OnChanges {
  @Input() data: RatingPoint[] = [];

  readonly W = 300;
  readonly H = 140;
  readonly PAD = 16;

  points: { x: number; y: number; date: string }[] = [];
  linePath = '';
  areaPath = '';
  hoveredIndex = -1;

  ngOnChanges() {
    this.buildPaths();
  }

  private buildPaths() {
    if (!this.data || this.data.length < 2) return;

    const ratings = this.data.map(d => d.ratingAfter);
    const minR = Math.min(...ratings);
    const maxR = Math.max(...ratings);
    const range = maxR - minR || 1;

    const chartW = this.W - this.PAD * 2;
    const chartH = this.H - this.PAD * 2;

    this.points = this.data.map((d, i) => ({
      x: this.PAD + (i / (this.data.length - 1)) * chartW,
      y: this.PAD + chartH - ((d.ratingAfter - minR) / range) * chartH,
      date: d.date,
    }));

    // Smooth cubic bezier path
    const lineD = this.points.map((pt, i) => {
      if (i === 0) return `M ${pt.x} ${pt.y}`;
      const prev = this.points[i - 1];
      const cpx = (prev.x + pt.x) / 2;
      return `C ${cpx} ${prev.y} ${cpx} ${pt.y} ${pt.x} ${pt.y}`;
    }).join(' ');

    this.linePath = lineD;
    this.areaPath = `${lineD} L ${this.points[this.points.length - 1].x} ${this.H - this.PAD} L ${this.PAD} ${this.H - this.PAD} Z`;
  }

  tooltipX(x: number): number {
    // Flip tooltip to left side if near right edge
    return x > this.W - 100 ? x - 88 : x + 4;
  }

  ratingDelta(index: number): number {
    if (index === 0) return 0;
    return this.data[index].ratingAfter - this.data[index - 1].ratingAfter;
  }
}