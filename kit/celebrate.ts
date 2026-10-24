/**
 * celebrate.ts: Casino Kit shared celebration engine (POLISH_SPECS K1 + P0-1).
 *
 * Original, procedural code only (DOM + Canvas2D + WebAudio). No images, fonts, or samples.
 * Play money only. Kit rule: this file imports nothing from games, so blackjack, craps,
 * and roulette can all share it.
 *
 *   const fx = createCelebrator(tableHostEl, { theme, quality: theme.quality });
 *   await fx.blackjack({ cards: handEls, chips: payoutColumnEl });
 *   await fx.celebrate('big', 'POINT!');   // craps / roulette
 */

export type Pt = { x: number; y: number };
export type Quality = 'auto' | 'high' | 'low';
export type Level = 'small' | 'big' | 'epic';
export type SoundId = 'win' | 'bj' | 'lose' | 'clack';

export interface CelebrateTheme {
  gold: string; goldDark: string; goldLight: string; red: string; cream: string; ink: string;
  text: string; dim: string; shadowInk: string; fontPrint: string; fontUi: string;
  chip: Record<number, [string, string]>;
}

/** Defaults mirror CASINO_KIT.md section 1. Pass the kit's `theme` to override. */
export const defaultTheme: CelebrateTheme = {
  gold: '#f2c14e', goldDark: '#c89527', goldLight: '#ffe08a', red: '#c8102e', cream: '#f7f3ea',
  ink: '#121212', text: '#fff8e7', dim: 'rgba(255,248,231,.65)', shadowInk: '#021a0e',
  fontPrint: 'Georgia, "Times New Roman", serif',
  fontUi: 'system-ui, -apple-system, Roboto, "Segoe UI", sans-serif',
  chip: { 1: ['#f4f4f4', '#1f4fa8'], 5: ['#c8102e', '#ffffff'], 25: ['#138a3a', '#ffffff'], 100: ['#151515', '#ffffff'],
          500: ['#6c2bb3', '#ffd34d'], 1000: ['#f2c14e', '#151515'], 5000: ['#e86a1c', '#ffffff'] },
};

/** theme.celebrate (K1). `big` holds 1200 ms so a blackjack toast ends at 2.35 s (P0-1 acceptance). */
export const celebrateLevels = {
  small: { toastMs: 900, holdMs: 1200, fadeMs: 250, particles: 0, haptic: 'win' },
  big:   { toastMs: 900, holdMs: 1200, fadeMs: 250, particles: 40, haptic: 'blackjack',
           palette: ['gold', 'cream', 'red'] as const, weights: [0.7, 0.15, 0.15] },
  epic:  { toastMs: 900, holdMs: 1800, fadeMs: 250, particles: 60, haptic: 'blackjack', ring: true },
} as const;

/** theme.haptics subset (K2/P0-3). The kit's ui.haptic can replace this through `onHaptic`. */
export const hapticPatterns: Record<string, number | number[]> = {
  tap: 12, chip: 8, win: [18, 60, 28], blackjack: [30, 40, 30, 40, 60], bust: 40,
};

export interface CelebrateOptions {
  theme?: Partial<CelebrateTheme>;
  quality?: Quality;            // 'low' = no particles, no blur (kit rule)
  reduceMotion?: boolean;       // default: prefers-reduced-motion
  speed?: number;               // anim.speed: 2 = everything takes half as long
  sound?: boolean;              // built-in synth (default false; the kit's Sound can take over via onSound)
  haptics?: boolean;            // default true
  manual?: boolean;             // no rAF; drive time yourself with advance(ms) (tests, capture)
  seed?: number;
  onHaptic?: (name: string, pattern: number | number[]) => void;
  onSound?: (id: SoundId, opts: { rate?: number; gain?: number }) => boolean | void; // return true = handled
}

export interface ToastOpts { text?: string; sub?: string; at?: Pt }
export interface Celebrator {
  win(o?: ToastOpts & { cards?: HTMLElement[] }): Promise<void>;
  blackjack(o?: ToastOpts & { cards?: HTMLElement[]; chips?: HTMLElement }): Promise<void>;
  push(o?: ToastOpts & { chips?: HTMLElement[] }): Promise<void>;
  bust(o?: ToastOpts & { cards?: HTMLElement[]; showToast?: boolean }): Promise<void>;
  lose(o?: { cards?: HTMLElement[] }): Promise<void>;
  bigWin(o: { amount: number; sub?: string; at?: Pt; to?: HTMLElement | Pt; denoms?: number[] }): Promise<void>;
  celebrate(level: Level, text: string, at?: Pt, sub?: string): Promise<void>;
  clear(): void;
  set(o: Partial<Pick<CelebrateOptions, 'quality' | 'reduceMotion' | 'speed' | 'sound' | 'haptics'>>): void;
  advance(ms: number): void;
  readonly stats: { particlesDrawn: number; activeParticles: number; peakParticles: number; quality: 'high' | 'low' };
  destroy(): void;
}

/* ----------------------------------------------------------------- helpers */
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const ease = {
  linear: (t: number) => t,
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inCubic: (t: number) => t * t * t,
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t: number, s = 1.4) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
};
function mulberry32(a: number) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function shade(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex); const f = (c: number) => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt);
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
const rgba = (hex: string, a: number) => { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; };

/** Kit chip (section 4), top view: body, six edge inlays, dashed ring, value disc, sheen. Shared by craps and roulette. */
export function drawChip(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, denom: number, theme: CelebrateTheme = defaultTheme) {
  const [body, inlay] = theme.chip[denom] || theme.chip[100];
  ctx.save(); ctx.translate(cx, cy);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = body; ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.06); ctx.strokeStyle = shade(body.length === 7 ? body : '#151515', -0.35); ctx.stroke();
  ctx.fillStyle = inlay;
  for (let i = 0; i < 6; i++) {
    ctx.save(); ctx.rotate((i / 6) * Math.PI * 2); ctx.fillRect(-r * 0.13, -r * 0.98, r * 0.26, r * 0.24); ctx.restore();
  }
  ctx.beginPath(); ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2); ctx.setLineDash([r * 0.12, r * 0.09]);
  ctx.lineWidth = Math.max(1, r * 0.05); ctx.strokeStyle = inlay; ctx.stroke(); ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(0, 0, r * 0.52, 0, Math.PI * 2); ctx.fillStyle = theme.cream; ctx.fill();
  const label = denom >= 1000 ? `${denom / 1000}K` : String(denom);
  ctx.fillStyle = denom === 1 ? inlay : body === theme.cream ? theme.ink : body;
  ctx.font = `700 ${r * (label.length > 2 ? 0.42 : 0.55)}px ${theme.fontUi}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, r * 0.04);
  const g = ctx.createRadialGradient(-r * 0.4, -r * 0.45, 0, -r * 0.4, -r * 0.45, r * 1.2);
  g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(0.5, 'rgba(255,255,255,.05)'); g.addColorStop(1, 'rgba(0,0,0,.18)');
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
  ctx.restore();
}

/* ------------------------------------------------------------------- sound */
class Synth {
  private ctx: AudioContext | null = null; private out: GainNode | null = null;
  private ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return this.ctx; }
    const AC: typeof AudioContext | undefined = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    this.ctx = new AC(); const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 6; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.12;
    this.out = this.ctx.createGain(); this.out.gain.value = 0.5; this.out.connect(comp); comp.connect(this.ctx.destination);
    return this.ctx;
  }
  private tone(f: number, t: number, dur: number, type: OscillatorType, gain: number, detuneCents = 0) {
    const c = this.ctx!; const o = c.createOscillator(); const g = c.createGain();
    o.type = type; o.frequency.value = f; o.detune.value = detuneCents;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.out!); o.start(t); o.stop(t + dur + 0.02);
  }
  play(id: SoundId, rate = 1) {
    const c = this.ensure(); if (!c) return; const t = c.currentTime + 0.01;
    if (id === 'win') [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => { this.tone(f, t + i * 0.09, 0.3, 'sine', 0.22); this.tone(f, t + i * 0.09, 0.2, 'triangle', 0.06); });
    else if (id === 'bj') [1046.5, 1174.66, 1318.51, 1567.98, 1760].forEach((f, i) => {
      const d = i === 4 ? 0.4 : 0.18; this.tone(f, t + i * 0.07, d, 'sine', 0.2); this.tone(f, t + i * 0.07, d, 'triangle', 0.07, 34); });
    else if (id === 'lose') { this.tone(392, t, 0.22, 'triangle', 0.16); this.tone(329.63, t + 0.16, 0.32, 'triangle', 0.16); }
    else if (id === 'clack') {
      this.tone(2900 * rate, t, 0.06, 'sine', 0.12); this.tone(4300 * rate, t, 0.05, 'sine', 0.07);
      const n = c.createBufferSource(); const b = c.createBuffer(1, Math.floor(c.sampleRate * 0.012), c.sampleRate);
      const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const g = c.createGain(); g.gain.value = 0.08; n.buffer = b; n.connect(g); g.connect(this.out!); n.start(t);
    }
  }
}

/* --------------------------------------------------------------- particles */
interface Particle {
  on: boolean; chip: boolean; x: number; y: number; vx: number; vy: number; rot: number; vr: number;
  flip: number; vflip: number; w: number; h: number; c1: string; c2: string; age: number; life: number;
  floor: number; bounces: number; landedAt: number; sprite: HTMLCanvasElement | null;
}
interface Ring { x: number; y: number; r0: number; r1: number; age: number; life: number; width: number; color: string }
interface Task { t0: number; dur: number; step: (p: number) => void; resolve: () => void; done: boolean }

const POOL = 60;

export function createCelebrator(host: HTMLElement, options: CelebrateOptions = {}): Celebrator {
  const theme: CelebrateTheme = { ...defaultTheme, ...(options.theme || {}), chip: { ...defaultTheme.chip, ...(options.theme?.chip || {}) } };
  const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  const o = {
    quality: options.quality ?? 'auto', reduceMotion: options.reduceMotion ?? !!mq?.matches,
    speed: options.speed ?? 1, sound: options.sound ?? false, haptics: options.haptics ?? true,
  };
  let autoLow = false;
  const rand = mulberry32(options.seed ?? 0x5eed);
  const synth = new Synth();
  const stats = { particlesDrawn: 0, activeParticles: 0, peakParticles: 0, quality: 'high' as 'high' | 'low' };

  /* DOM layer: canvas for particles plus a DOM toast. Pointer-events none, so it never blocks taps. */
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  const layer = document.createElement('div'); layer.className = 'cel-layer';
  const dim = document.createElement('div'); dim.className = 'cel-dim';
  const canvas = document.createElement('canvas'); canvas.className = 'cel-canvas';
  const live = document.createElement('div'); live.className = 'cel-live'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite');
  layer.append(dim, canvas, live); host.appendChild(layer);
  const style = document.createElement('style'); style.textContent = css(theme); layer.appendChild(style);
  const ctx = canvas.getContext('2d')!;
  let W = 1, H = 1, dpr = 1, S = 1;
  const resize = () => {
    const r = host.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
    dpr = Math.min(2, window.devicePixelRatio || 1); canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    S = Math.min(W, H) / 900; // kit virtual layout is 1600x900 / 900x1600
    host.style.setProperty('--cel-s', String(S));
  };
  resize();
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null; ro?.observe(host);

  const low = () => o.quality === 'low' || (o.quality === 'auto' && autoLow);
  const calm = () => o.reduceMotion || low(); // fade-only toast path (P0-1)

  /* sprites cached per denom (P1-5) */
  const sprites = new Map<number, HTMLCanvasElement>();
  const sprite = (d: number) => {
    let s = sprites.get(d); if (s) return s;
    s = document.createElement('canvas'); const R = 34; s.width = s.height = R * 2 * 2;
    const c = s.getContext('2d')!; c.scale(2, 2); drawChip(c, R, R, R - 1, d, theme); sprites.set(d, s); return s;
  };

  const pool: Particle[] = Array.from({ length: POOL }, () => ({ on: false, chip: false, x: 0, y: 0, vx: 0, vy: 0, rot: 0, vr: 0, flip: 0, vflip: 0,
    w: 0, h: 0, c1: '', c2: '', age: 0, life: 0, floor: 0, bounces: 0, landedAt: -1, sprite: null }));
  const rings: Ring[] = [];
  let tasks: Task[] = [];
  let clock = 0; let endedAt = -1e9; let clackAt = -1e9; let clacks = 0;

  const grab = () => { for (const p of pool) if (!p.on) { p.on = true; p.bounces = 0; p.landedAt = -1; return p; } return null; };

  /* timing: every duration scales with anim.speed */
  const anim = (ms: number, step: (p: number) => void = () => {}) => new Promise<void>((resolve) => {
    const dur = ms / Math.max(0.1, o.speed);
    if (dur <= 0) { step(1); resolve(); return; }
    // chained phases start exactly where the previous one ended (no per-frame drift)
    const t0 = endedAt <= clock && clock - endedAt < 34 ? endedAt : clock;
    tasks.push({ t0, dur, step, resolve, done: false }); kick();
  });
  const wait = (ms: number) => anim(ms);

  /* loop: one shared rAF, idle when nothing is running */
  let raf = 0, last = 0, frameAcc = 0, frameN = 0;
  const kick = () => { if (!options.manual && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); } };
  const loop = (t: number) => {
    raf = 0; const dt = Math.min(50, t - last); last = t;
    if (o.quality === 'auto' && !autoLow) { frameAcc += dt; frameN++; if (frameN >= 120) { if (frameAcc / frameN > 20) autoLow = true; frameAcc = 0; frameN = 0; } }
    step(dt);
    if (tasks.length || rings.length || pool.some((p) => p.on)) kick();
  };
  function step(dtMs: number) {
    clock += dtMs;
    const cur = tasks; tasks = [];
    for (const k of cur) {
      const p = clamp01((clock - k.t0) / k.dur); k.step(p);
      if (p >= 1) { k.done = true; endedAt = Math.max(endedAt, k.t0 + k.dur); k.resolve(); } else tasks.push(k);
    }
    simulate(dtMs / 1000); draw();
  }

  function simulate(dt: number) {
    let n = 0;
    for (const p of pool) {
      if (!p.on) continue;
      p.age += dt * 1000 * o.speed; if (p.age < 0) continue;
      if (p.age >= p.life) { p.on = false; continue; }
      const sdt = dt * o.speed; n++;
      if (p.chip) {
        p.vy += 1400 * S * sdt; p.x += p.vx * sdt; p.y += p.vy * sdt; p.rot += p.vr * sdt;
        if (p.landedAt < 0) p.flip += p.vflip * sdt;
        if (p.y >= p.floor && p.vy > 0) {
          if (p.bounces === 0) {
            p.y = p.floor; p.vy = -p.vy * 0.35; p.vx *= 0.6; p.vr *= 0.5; p.bounces = 1;
            if (clock - clackAt > 45 && clacks < 14) { clackAt = clock; clacks++; sound('clack', { rate: 1 + 0.03 * clacks, gain: 0.6 }); }
          } else { p.y = p.floor; p.vy = 0; p.vx = 0; p.vr = 0; if (p.landedAt < 0) { p.landedAt = p.age; p.rot = (rand() - 0.5) * 0.3; p.life = Math.min(p.life, p.age + 520); } }
        }
      } else {
        const k = 1.6; p.vx -= p.vx * k * sdt; p.vy += (1400 * S - p.vy * k) * sdt;
        p.x += p.vx * sdt; p.y += p.vy * sdt; p.rot += p.vr * sdt; p.flip += p.vflip * sdt;
      }
    }
    stats.activeParticles = n; stats.peakParticles = Math.max(stats.peakParticles, n);
    for (let i = rings.length - 1; i >= 0; i--) { rings[i].age += dt * 1000 * o.speed; if (rings[i].age >= rings[i].life) rings.splice(i, 1); }
  }

  function draw() {
    stats.quality = low() ? 'low' : 'high';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    for (const r of rings) {
      const p = r.age / r.life; const e = ease.outCubic(p);
      ctx.save(); ctx.globalAlpha = 1 - p; ctx.strokeStyle = r.color; ctx.lineWidth = r.width * (1 - 0.5 * p);
      if (!low()) { ctx.shadowColor = r.color; ctx.shadowBlur = 14 * S; }
      ctx.beginPath(); ctx.arc(r.x, r.y, lerp(r.r0, r.r1, o.reduceMotion ? 0 : e), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    if (low() || o.reduceMotion) { for (const p of pool) p.on = false; return; } // hard guarantee: zero particles drawn
    for (const p of pool) {
      if (!p.on || p.age < 0) continue;
      stats.particlesDrawn++;
      const fade = clamp01((p.life - p.age) / 300);
      ctx.save(); ctx.globalAlpha = fade; ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      if (p.chip && p.sprite) {
        const sy = p.landedAt >= 0 ? 0.42 : Math.max(0.22, Math.abs(Math.cos(p.flip)));
        const sz = p.w;
        if (p.landedAt >= 0 || sy < 0.6) { // edge thickness for a fake 3-D coin
          ctx.save(); ctx.scale(1, sy); ctx.fillStyle = shade(p.c1, -0.45);
          ctx.beginPath(); ctx.arc(0, sz * 0.14 / sy, sz / 2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
        ctx.scale(1, sy); ctx.drawImage(p.sprite, -sz / 2, -sz / 2, sz, sz);
      } else {
        const c = Math.cos(p.flip); ctx.scale(1, Math.max(0.08, Math.abs(c)));
        ctx.fillStyle = c >= 0 ? p.c1 : p.c2; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx.restore();
    }
  }

  /* effects */
  const palette = () => ({ gold: theme.gold, cream: theme.cream, red: theme.red } as Record<string, string>);
  function confetti(at: Pt, count: number) {
    if (low() || o.reduceMotion) return;
    const lv = celebrateLevels.big; const pal = palette();
    for (let i = 0; i < count; i++) {
      const p = grab(); if (!p) break;
      let u = rand(), idx = 0; while (idx < lv.weights.length - 1 && u > lv.weights[idx]) { u -= lv.weights[idx]; idx++; }
      const col = pal[lv.palette[idx]];
      const a = ((10 + rand() * 160) * Math.PI) / 180; const v = (380 + rand() * 340) * S * 1.15;
      Object.assign(p, { chip: false, x: at.x + (rand() - 0.5) * 360 * S, y: at.y + (rand() - 0.5) * 30 * S, vx: Math.cos(a) * v, vy: -Math.sin(a) * v,
        rot: rand() * Math.PI, vr: (rand() - 0.5) * 4 * Math.PI, flip: rand() * Math.PI, vflip: (6 + rand() * 8) * (rand() < 0.5 ? -1 : 1),
        w: 6 * S * 2.2, h: 10 * S * 2.2, c1: col, c2: shade(col, -0.3), age: -rand() * 60, life: 1100 + rand() * 400, sprite: null });
    }
  }
  function chipShower(target: Pt, count: number, denoms: number[]) {
    if (low() || o.reduceMotion) return; clacks = 0;
    for (let i = 0; i < count; i++) {
      const p = grab(); if (!p) break;
      const d = denoms[Math.floor(rand() * denoms.length)];
      const sx = lerp(W * 0.12, W * 0.88, rand()); const tx = target.x + (rand() - 0.5) * W * 0.26;
      const fall = Math.max(0.5, (target.y + 80 * S) / (1400 * S)); // rough time to floor, s
      Object.assign(p, { chip: true, x: sx, y: -40 * S - rand() * 160 * S, vx: (tx - sx) / (fall * 1.6), vy: (120 + rand() * 260) * S,
        rot: (rand() - 0.5) * 0.6, vr: (rand() - 0.5) * 3, flip: rand() * Math.PI, vflip: (5 + rand() * 7) * (rand() < 0.5 ? -1 : 1),
        w: 50 * S, h: 50 * S, c1: theme.chip[d][0], c2: theme.chip[d][1], age: -i * 14 - rand() * 60, life: 3400,
        floor: target.y + (rand() - 0.5) * 60 * S, sprite: sprite(d) });
    }
  }
  function ring(at: Pt, r0: number, r1: number, life: number, width: number) {
    if (o.reduceMotion) return; rings.push({ x: at.x, y: at.y, r0, r1, age: 0, life, width, color: theme.gold });
  }

  function sound(id: SoundId, so: { rate?: number; gain?: number } = {}) {
    if (options.onSound && options.onSound(id, so)) return;
    if (o.sound) try { synth.play(id, so.rate); } catch { /* audio is best-effort */ }
  }
  let lastHaptic = -1e9;
  function haptic(name: string) {
    const pat = hapticPatterns[name]; if (pat == null) return;
    if (options.onHaptic) { options.onHaptic(name, pat); return; }
    if (!o.haptics || typeof navigator === 'undefined' || !('vibrate' in navigator) || document.hidden) return;
    const t = performance.now(); if (t - lastHaptic < 60) return; lastHaptic = t; try { navigator.vibrate(pat); } catch { /* ignore */ }
  }

  /* toast (P0-1). One beat per round: a new toast replaces the old one. */
  let toastEl: HTMLElement | null = null; let toastToken = 0;
  const center = (): Pt => ({ x: W / 2, y: H * 0.38 });
  const relPt = (el: HTMLElement): Pt => { const a = el.getBoundingClientRect(), b = host.getBoundingClientRect(); return { x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2 }; };
  type Kind = 'bj' | 'win' | 'push' | 'bust' | 'big';
  async function toast(kind: Kind, text: string, at: Pt, level: Level, sub?: string, onIn?: (p: number) => void) {
    const token = ++toastToken; toastEl?.remove();
    const el = document.createElement('div'); el.className = `cel-toast cel-${kind}`;
    const ornament = kind === 'bj' || kind === 'big';
    el.innerHTML = `${ornament ? '<div class="cel-rule"><span></span><i></i><span></span></div>' : ''}<div class="cel-text"></div>${ornament ? '<div class="cel-rule"><span></span><i></i><span></span></div>' : ''}${sub ? '<div class="cel-sub"></div>' : ''}`;
    (el.querySelector('.cel-text') as HTMLElement).textContent = text;
    if (sub) (el.querySelector('.cel-sub') as HTMLElement).textContent = sub;
    el.style.left = `${at.x}px`; el.style.top = `${at.y}px`; el.style.opacity = '0';
    layer.appendChild(el); toastEl = el; live.textContent = sub ? `${text}. ${sub}` : text;
    const rules = Array.from(el.querySelectorAll<HTMLElement>('.cel-rule span'));
    const subEl = el.querySelector<HTMLElement>('.cel-sub');
    const lv = celebrateLevels[level];
    const fit = Math.min(1, (W * 0.92) / Math.max(1, el.offsetWidth)); // never overflow narrow portrait screens
    const set = (s: number, a: number) => { el.style.transform = `translate(-50%,-50%) scale(${s * fit})`; el.style.opacity = String(a); };
    if (calm()) {
      set(1, 0); rules.forEach((r) => (r.style.transform = 'scaleX(1)')); if (subEl) subEl.style.opacity = '1';
      await anim(200, (p) => { set(1, p); onIn?.(p); });
    } else {
      set(0.6, 0); rules.forEach((r) => (r.style.transform = 'scaleX(0)')); if (subEl) subEl.style.opacity = '0';
      anim(lv.toastMs + 300, (p) => {
        const q = clamp01((p * (lv.toastMs + 300) - 300) / lv.toastMs); // side banner slides in 300 ms after
        if (subEl) { subEl.style.opacity = String(ease.outCubic(q)); subEl.style.transform = `translateY(${(1 - ease.outCubic(q)) * 14}px)`; }
      });
      await anim(lv.toastMs, (p) => {
        const s = p < 0.55 ? lerp(0.6, 1.08, ease.outBack(p / 0.55, 1.4)) : lerp(1.08, 1.0, ease.inOutCubic((p - 0.55) / 0.45));
        set(s, clamp01(p / 0.28));
        const rp = ease.outCubic(clamp01((p - 0.25) / 0.6)); rules.forEach((r) => (r.style.transform = `scaleX(${rp})`));
        onIn?.(p);
      });
    }
    if (token !== toastToken) return;
    await wait(lv.holdMs);
    if (token !== toastToken) return;
    await anim(lv.fadeMs, (p) => set(calm() ? 1 : 1 + 0.04 * p, 1 - p));
    if (token === toastToken) { el.remove(); toastEl = null; }
  }

  /* card / chip DOM helpers */
  const glow = (cards: HTMLElement[] | undefined, a: number) => cards?.forEach((c) => {
    c.style.boxShadow = a <= 0 ? '' : low()
      ? `0 0 0 ${2 * a}px ${theme.gold}`
      : `0 0 0 2px ${rgba(theme.gold, a)}, 0 0 ${26 * S * 1.4}px ${8 * S}px ${rgba(theme.gold, 0.55 * a)}`;
  });
  const touched = new Set<HTMLElement>();
  const mark = (els?: HTMLElement[]) => els?.forEach((e) => touched.add(e));
  function clear() {
    toastToken++; toastEl?.remove(); toastEl = null; dim.style.opacity = '0';
    touched.forEach((c) => { c.style.boxShadow = ''; c.style.opacity = ''; c.style.translate = ''; }); touched.clear();
    for (const p of pool) p.on = false; rings.length = 0; live.textContent = '';
  }

  const api: Celebrator = {
    stats,
    async win(w = {}) {
      clear(); mark(w.cards); haptic('win'); sound('win');
      anim(600, (p) => glow(w.cards, Math.sin(Math.PI * p)));
      await toast('win', w.text ?? 'YOU WIN', w.at ?? center(), 'small', w.sub);
    },
    async blackjack(b = {}) {
      clear(); mark(b.cards); haptic('blackjack'); sound('bj');
      const at = b.at ?? center();
      anim(200, (p) => glow(b.cards, p));
      if (b.chips) { const c = relPt(b.chips); ring(c, 34 * S, 34 * S * 1.4, 300, 2); }
      ring(at, 120 * S, 300 * S, 520, 5 * S);
      wait(110).then(() => { ring(at, 90 * S, 380 * S, 700, 2.5 * S); confetti(at, celebrateLevels.big.particles); });
      await toast('bj', b.text ?? 'BLACKJACK!', at, 'big', b.sub);
    },
    async push(pu = {}) {
      clear(); mark(pu.chips);
      if (!o.reduceMotion) pu.chips?.forEach((c) => anim(160, (p) => (c.style.translate = `0 ${Math.sin(Math.PI * p) * 4 * S}px`)));
      await toast('push', pu.text ?? 'PUSH', pu.at ?? center(), 'small', pu.sub);
    },
    async bust(bu = {}) {
      clear(); mark(bu.cards); haptic('bust'); sound('lose');
      anim(200, (p) => { bu.cards?.forEach((c) => (c.style.opacity = String(1 - 0.5 * p))); dim.style.opacity = String(p); });
      if (!o.reduceMotion) bu.cards?.forEach((c, i) => anim(300, (p) => (c.style.translate = `${Math.sin(p * Math.PI * 6 + i) * 6 * S * (1 - p)}px 0`)));
      const t = bu.showToast === false ? wait(2350) : toast('bust', bu.text ?? 'BUST', bu.at ?? center(), 'small', bu.sub);
      await t;
      await anim(600, (p) => (dim.style.opacity = String(1 - p)));
    },
    async lose(l = {}) {
      clear(); mark(l.cards); sound('lose');
      await anim(200, (p) => l.cards?.forEach((c) => (c.style.opacity = String(1 - 0.5 * p))));
    },
    async bigWin(bw) {
      clear(); haptic('blackjack'); sound('bj');
      const at = bw.at ?? center();
      const to = !bw.to ? { x: W / 2, y: H * 0.86 } : 'x' in bw.to ? (bw.to as Pt) : relPt(bw.to as HTMLElement);
      chipShower(to, celebrateLevels.epic.particles, bw.denoms ?? [25, 100, 100, 500, 1000]);
      ring(at, 120 * S, 320 * S, 560, 5 * S);
      wait(1150).then(() => ring(to, 40 * S, 200 * S, 520, 3 * S));
      const fmt = (n: number) => '+' + Math.round(n).toLocaleString('en-US');
      await toast('big', calm() ? fmt(bw.amount) : fmt(0), at, 'epic', bw.sub, (p) => {
        const t = toastEl?.querySelector('.cel-text'); if (t) t.textContent = fmt(bw.amount * ease.outCubic(p));
      });
    },
    async celebrate(level, text, at, sub) {
      if (level === 'small') return api.win({ text, at, sub });
      if (level === 'big') return api.blackjack({ text, at, sub });
      clear(); haptic('blackjack'); sound('bj'); const c = at ?? center();
      ring(c, 120 * S, 320 * S, 560, 5 * S); confetti(c, celebrateLevels.epic.particles);
      await toast('big', text, c, 'epic', sub);
    },
    clear,
    set(n) { Object.assign(o, n); if (n.quality) autoLow = false; },
    advance(ms) { const n = Math.ceil(ms / 16.667); for (let i = 0; i < n; i++) step(ms / n); },
    destroy() { clear(); cancelAnimationFrame(raf); ro?.disconnect(); layer.remove(); },
  };
  return api;
}

function css(t: CelebrateTheme) {
  return `
.cel-layer{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:50;--cel-s:1}
.cel-canvas{position:absolute;inset:0;width:100%;height:100%}
.cel-live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.cel-dim{position:absolute;inset:0;opacity:0;background:radial-gradient(ellipse at 50% 55%,${rgba(t.red, 0)} 35%,${rgba(t.red, 0.16)} 78%,${rgba(t.red, 0.26)} 100%),rgba(10,0,2,.14)}
.cel-toast{position:absolute;display:flex;flex-direction:column;align-items:center;white-space:nowrap;text-align:center;will-change:transform,opacity}
.cel-text{font-family:${t.fontPrint};font-weight:700;line-height:1.05;letter-spacing:.03em;padding:0 .1em}
.cel-bj .cel-text,.cel-big .cel-text{font-size:calc(96px*var(--cel-s));background:linear-gradient(180deg,${t.goldLight} 0%,${t.gold} 55%,${t.goldDark} 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 calc(2px*var(--cel-s)) 0 ${t.shadowInk});letter-spacing:.06em}
.cel-big .cel-text{font-variant-numeric:tabular-nums}
.cel-win .cel-text{font-size:calc(72px*var(--cel-s));color:${t.text};-webkit-text-stroke:calc(4px*var(--cel-s)) ${t.gold};paint-order:stroke fill;text-shadow:0 2px 0 ${t.shadowInk}}
.cel-push .cel-text{font-size:calc(64px*var(--cel-s));color:${t.dim};letter-spacing:.12em}
.cel-bust .cel-text{font-size:calc(56px*var(--cel-s));color:${t.red};-webkit-text-stroke:calc(3px*var(--cel-s)) ${t.cream};paint-order:stroke fill;letter-spacing:.1em;text-shadow:0 2px 0 ${t.shadowInk}}
.cel-rule{display:flex;align-items:center;gap:calc(10px*var(--cel-s));width:100%;margin:calc(6px*var(--cel-s)) 0}
.cel-rule span{flex:1;height:calc(2px*var(--cel-s));background:linear-gradient(90deg,transparent,${t.gold});transform-origin:100% 50%}
.cel-rule span:last-child{background:linear-gradient(90deg,${t.gold},transparent);transform-origin:0 50%}
.cel-rule i{width:calc(10px*var(--cel-s));height:calc(10px*var(--cel-s));background:${t.gold};transform:rotate(45deg);box-shadow:0 1px 0 ${t.shadowInk}}
.cel-sub{margin-top:calc(14px*var(--cel-s));padding:calc(6px*var(--cel-s)) calc(18px*var(--cel-s));border-radius:999px;background:${t.cream};color:${t.ink};font:600 calc(22px*var(--cel-s)) ${t.fontUi};letter-spacing:.02em;box-shadow:0 3px 10px rgba(0,0,0,.35)}
`;
}
