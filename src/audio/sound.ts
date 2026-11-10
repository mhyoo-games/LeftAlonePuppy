// 칩튠 배경음악·효과음 (Web Audio로 합성, 음원 파일 없음). 곡은 모두 새로 씀.

const NAMES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function midi(n: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(n);
  if (!m) throw new Error('음 이름: ' + n);
  return 12 * (Number(m[3]) + 1) + NAMES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
/** "C5:1 E5:.5 -:1" → [[음, 박]] */
export function parseNotes(s: string): Array<[number | null, number]> {
  return s.trim().split(/\s+/).map((t) => { const [n, d] = t.split(':'); return [n === '-' ? null : midi(n), Number(d)]; });
}

interface Track { bpm: number; lead: string; bass: string; drum: string; wave?: OscillatorType; loop?: boolean }
// 각 곡: 리드·베이스는 같은 길이(박)로, 드럼은 한 마디 16칸
export const TRACKS: Record<string, Track> = {
  title: { bpm: 96, wave: 'triangle',
    lead: 'E5:1 G5:.5 E5:.5 D5:1 C5:1 D5:1 E5:.5 D5:.5 C5:2 A4:1 C5:.5 D5:.5 E5:1 G5:1 F5:1 E5:.5 D5:.5 C5:2',
    bass: 'C3:2 G2:2 F2:2 C3:2 A2:2 E2:2 F2:2 G2:2', drum: 'k.......s.......' },
  map: { bpm: 112, wave: 'square',
    lead: 'C5:.5 E5:.5 G5:.5 E5:.5 F5:1 A5:1 G5:.5 E5:.5 C5:.5 E5:.5 D5:2 C5:.5 E5:.5 G5:.5 C6:.5 B5:1 G5:1 A5:.5 F5:.5 D5:.5 B4:.5 C5:2',
    bass: 'C3:1 G2:1 F2:1 F2:1 C3:1 G2:1 G2:2 C3:1 G2:1 E2:1 E2:1 F2:1 G2:1 C3:2', drum: 'k...h...s...h...' },
  farm: { bpm: 124, wave: 'square',
    lead: 'G4:.5 C5:.5 E5:.5 C5:.5 D5:.5 E5:.5 F5:1 E5:.5 D5:.5 C5:.5 D5:.5 E5:1 C5:1 A4:.5 C5:.5 F5:.5 E5:.5 D5:.5 C5:.5 B4:1 C5:.5 D5:.5 G4:.5 B4:.5 C5:2',
    bass: 'C3:.5 G3:.5 C3:.5 G3:.5 F2:.5 C3:.5 F2:.5 C3:.5 C3:.5 G3:.5 C3:.5 G3:.5 F2:.5 C3:.5 G2:.5 D3:.5 G2:.5 D3:.5 G2:.5 D3:.5 C3:.5 G3:.5 C3:1', drum: 'k...s...k.k.s...' },
  field: { bpm: 108, wave: 'triangle',
    lead: 'D5:1 F#5:.5 A5:.5 B5:1 A5:1 G5:.5 F#5:.5 E5:.5 D5:.5 E5:2 D5:1 F#5:.5 A5:.5 D6:1 B5:1 A5:.5 G5:.5 F#5:.5 E5:.5 D5:2',
    bass: 'D3:2 G2:2 A2:2 A2:2 D3:2 G2:2 A2:2 D3:2', drum: 'k..hk.h.s..hk.h.' },
  forest: { bpm: 116, wave: 'square',
    lead: 'A4:.5 C5:.5 E5:.5 A5:.5 G5:1 E5:1 F5:.5 E5:.5 D5:.5 C5:.5 B4:2 A4:.5 C5:.5 E5:.5 A5:.5 B5:1 G5:1 F5:.5 D5:.5 E5:.5 G#4:.5 A4:2',
    bass: 'A2:1 E3:1 A2:1 C3:1 D3:1 A2:1 E3:2 A2:1 E3:1 G2:1 G2:1 F2:1 E2:1 A2:2', drum: 'k.h.s.h.k.k.s.h.' },
  river: { bpm: 100, wave: 'triangle',
    lead: 'E5:1.5 D5:.5 C5:1 G4:1 A4:1.5 B4:.5 C5:2 D5:1.5 E5:.5 F5:1 E5:1 D5:1 C5:.5 D5:.5 E5:2',
    bass: 'C3:1 G3:1 C3:1 G3:1 F2:1 C3:1 F2:1 C3:1 G2:1 D3:1 G2:1 D3:1 C3:1 G3:1 C3:2', drum: 'k.......k...s...' },
  cave: { bpm: 90, wave: 'triangle',
    lead: 'E4:1 -:.5 G4:.5 B4:1 A4:1 -:1 F#4:1 G4:1 E4:1 -:1 B4:.5 C5:.5 D5:1 C5:1 B4:2 -:2',
    bass: 'E2:2 E2:2 C2:2 C2:2 E2:2 E2:2 B1:2 B1:2', drum: 'k.......h.......' },
  snow: { bpm: 104, wave: 'square',
    lead: 'B4:.5 E5:.5 G5:.5 B5:.5 A5:1 G5:.5 F#5:.5 G5:1 E5:1 D5:1 -:1 C5:.5 E5:.5 G5:.5 C6:.5 B5:1 A5:.5 G5:.5 F#5:1 D#5:1 E5:2',
    bass: 'E2:1 B2:1 E2:1 B2:1 C2:1 G2:1 D2:1 A2:1 A2:1 E2:1 A2:1 E2:1 B1:1 F#2:1 E2:2', drum: 'k...h.h.s...h.h.' },
  town: { bpm: 132, wave: 'square',
    lead: 'C5:.5 C5:.5 G4:.5 C5:.5 E5:.5 E5:.5 C5:1 F5:.5 F5:.5 E5:.5 D5:.5 E5:2 C5:.5 C5:.5 G4:.5 C5:.5 E5:.5 G5:.5 A5:1 G5:.5 E5:.5 D5:.5 B4:.5 C5:2',
    bass: 'C3:.5 C3:.5 G2:.5 G2:.5 C3:.5 C3:.5 G2:.5 G2:.5 F2:.5 F2:.5 C3:.5 C3:.5 G2:.5 G2:.5 G2:.5 G2:.5 C3:.5 C3:.5 G2:.5 G2:.5 F2:.5 F2:.5 F2:.5 F2:.5 G2:.5 G2:.5 G2:.5 G2:.5 C3:2', drum: 'k.h.s.h.k.h.s.hs' },
  city: { bpm: 100, wave: 'triangle',
    lead: 'A4:1 C5:1 E5:1 D5:.5 C5:.5 B4:1 G4:1 C5:2 F4:1 A4:1 C5:1 B4:.5 A4:.5 G#4:2 E5:2',
    bass: 'A2:2 A2:2 E2:2 C3:2 F2:2 F2:2 E2:2 E2:2', drum: 'k...h...s...h..h' },
  boss: { bpm: 150, wave: 'square',
    lead: 'E5:.5 E5:.5 G5:.5 E5:.5 A5:.5 G5:.5 E5:.5 D5:.5 E5:.5 E5:.5 G5:.5 E5:.5 B5:.5 A5:.5 G5:.5 F#5:.5 E5:.5 E5:.5 G5:.5 E5:.5 A5:.5 G5:.5 E5:.5 D5:.5 C5:.5 D5:.5 E5:.5 G5:.5 F#5:1 D#5:1',
    bass: 'E2:.5 E3:.5 E2:.5 E3:.5 E2:.5 E3:.5 E2:.5 E3:.5 E2:.5 E3:.5 E2:.5 E3:.5 G2:.5 G3:.5 A2:.5 A3:.5 C3:.5 C3:.5 C3:.5 C3:.5 C3:.5 C3:.5 C3:.5 C3:.5 B2:.5 B2:.5 B2:.5 B2:.5 B2:1 B2:1', drum: 'k.s.k.s.k.s.kkss' },
  ending: { bpm: 84, wave: 'triangle',
    lead: 'G4:1 C5:1 E5:1 D5:.5 C5:.5 D5:2 E5:1 F5:1 G5:1 E5:.5 C5:.5 D5:2 E5:1 G5:1 A5:1 G5:.5 E5:.5 F5:1 D5:1 E5:1 C5:3',
    bass: 'C3:2 E2:2 G2:2 G2:2 C3:2 F2:2 G2:2 G2:2 A2:2 F2:2 G2:2 C3:2', drum: 'k.......s.......' },
};

export class Sound {
  ctx: AudioContext | null = null;
  private master!: GainNode; private mus!: GainNode; private fx!: GainNode;
  private noise!: AudioBuffer;
  private track: Track | null = null; private name = '';
  private lead: Array<[number | null, number]> = []; private bass: Array<[number | null, number]> = [];
  private start = 0; private li = 0; private bi = 0; private lt = 0; private bt = 0; private db = 0; private len = 0;
  muted = false;

  /** 손가락·키를 처음 쓸 때 켠다 (브라우저 규칙) */
  unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const c = this.ctx;
      this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : 0.7; this.master.connect(c.destination);
      this.mus = c.createGain(); this.mus.gain.value = 0.32; this.mus.connect(this.master);
      this.fx = c.createGain(); this.fx.gain.value = 0.55; this.fx.connect(this.master);
      this.noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = this.noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      setInterval(() => this.pump(), 60);
      try { const as = (navigator as any).audioSession; if (as) as.type = 'playback'; } catch { /* */ }
    }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
  }
  setMuted(m: boolean): void { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.7; }

  // ── 배경음악 ──
  music(name: string): void {
    if (name === this.name) return;
    this.name = name;
    if (!this.ctx) return;
    // 앞 곡은 빠르게 줄이고 새 줄로
    const now = this.ctx.currentTime;
    this.mus.gain.cancelScheduledValues(now); this.mus.gain.setValueAtTime(this.mus.gain.value, now); this.mus.gain.linearRampToValueAtTime(0, now + 0.08);
    const old = this.mus;
    setTimeout(() => old.disconnect(), 200);
    this.mus = this.ctx.createGain(); this.mus.gain.value = 0.32; this.mus.connect(this.master);
    const t = TRACKS[name];
    this.track = t ?? null;
    if (!t) return;
    this.lead = parseNotes(t.lead); this.bass = parseNotes(t.bass);
    this.len = this.lead.reduce((s, [, d]) => s + d, 0);
    this.start = now + 0.1; this.li = 0; this.bi = 0; this.lt = 0; this.bt = 0; this.db = 0;
  }
  private pump(): void {
    const c = this.ctx, t = this.track;
    if (!c || !t || c.state !== 'running') return;
    const spb = 60 / t.bpm, horizon = c.currentTime + 0.3;
    const at = (beat: number) => this.start + beat * spb;
    while (at(this.lt) < horizon) {
      const [n, d] = this.lead[this.li];
      if (n !== null) this.tone(t.wave ?? 'square', hz(n), at(this.lt), d * spb * 0.9, 0.16, this.mus);
      this.lt += d; this.li++;
      if (this.li >= this.lead.length) { this.li = 0; }
    }
    while (at(this.bt) < horizon) {
      const [n, d] = this.bass[this.bi];
      if (n !== null) this.tone('triangle', hz(n), at(this.bt), d * spb * 0.85, 0.3, this.mus);
      this.bt += d; this.bi++;
      if (this.bi >= this.bass.length) this.bi = 0;
    }
    while (at(this.db) < horizon) {
      const step = Math.round((this.db % 4) * 4) % 16, ch = t.drum[step];
      if (ch === 'k') this.kick(at(this.db));
      else if (ch === 's') this.hit(at(this.db), 'bandpass', 1800, 0.09, 0.22, this.mus);
      else if (ch === 'h') this.hit(at(this.db), 'highpass', 7000, 0.03, 0.08, this.mus);
      this.db += 0.25;
    }
  }

  private tone(type: OscillatorType, f: number, at: number, len: number, vol: number, out: AudioNode, slideTo?: number): void {
    const c = this.ctx!;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, at);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, at + len);
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol, at + 0.008); g.gain.setValueAtTime(vol, at + Math.max(0.01, len - 0.03)); g.gain.linearRampToValueAtTime(0, at + len);
    o.connect(g).connect(out); o.start(at); o.stop(at + len + 0.02);
  }
  private hit(at: number, type: BiquadFilterType, f: number, len: number, vol: number, out: AudioNode): void {
    const c = this.ctx!;
    const s = c.createBufferSource(); s.buffer = this.noise;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f;
    const g = c.createGain(); g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.001, at + len);
    s.connect(fl).connect(g).connect(out); s.start(at, Math.random() * 0.5); s.stop(at + len + 0.02);
  }
  private kick(at: number): void { this.tone('sine', 150, at, 0.12, 0.5, this.mus, 45); }

  // ── 효과음 ──
  sfx(name: string): void {
    const c = this.ctx; if (!c || c.state !== 'running') return;
    const t = c.currentTime + 0.005, o = this.fx;
    const arp = (notes: number[], step: number, type: OscillatorType = 'square', vol = 0.18) => notes.forEach((n, i) => this.tone(type, hz(n), t + i * step, step * 1.1, vol, o));
    switch (name) {
      case 'jump': this.tone('square', 280, t, 0.12, 0.14, o, 620); break;
      case 'jump2': this.tone('square', 520, t, 0.1, 0.12, o, 1040); this.tone('triangle', 780, t + 0.05, 0.1, 0.12, o, 1300); break;
      case 'bark': this.tone('square', 560, t, 0.06, 0.16, o, 420); this.tone('triangle', 330, t + 0.06, 0.1, 0.22, o, 220); this.hit(t, 'bandpass', 900, 0.08, 0.12, o); break;
      case 'bone': arp([88, 93], 0.06, 'square', 0.12); break;
      case 'heart': arp([72, 76, 79, 84], 0.06, 'triangle', 0.22); break;
      case 'memory': arp([72, 76, 79, 84, 88, 91], 0.08, 'square', 0.14); break;
      case 'stomp': this.tone('square', 260, t, 0.1, 0.18, o, 90); break;
      case 'bonk': this.tone('square', 180, t, 0.08, 0.14, o, 140); break;
      case 'hurt': this.tone('sawtooth', 420, t, 0.25, 0.16, o, 140); break;
      case 'spring': this.tone('triangle', 200, t, 0.28, 0.26, o, 760); break;
      case 'splash': this.hit(t, 'bandpass', 1200, 0.3, 0.3, o); break;
      case 'break': this.hit(t, 'bandpass', 2500, 0.12, 0.2, o); break;
      case 'land': this.hit(t, 'lowpass', 400, 0.05, 0.12, o); break;
      case 'creak': this.tone('square', 120, t, 0.08, 0.08, o, 100); break;
      case 'check': arp([79, 84, 88], 0.09, 'triangle', 0.24); break;
      case 'boss': this.tone('sawtooth', 110, t, 0.6, 0.18, o, 82); this.tone('sawtooth', 116, t, 0.6, 0.14, o, 87); break;
      case 'charge': this.hit(t, 'bandpass', 600, 0.3, 0.2, o); break;
      case 'thud': this.tone('sine', 120, t, 0.25, 0.5, o, 40); this.hit(t, 'lowpass', 300, 0.2, 0.3, o); break;
      case 'bossStun': arp([84, 79, 84, 79], 0.05, 'square', 0.12); break;
      case 'bossHit': this.tone('square', 600, t, 0.15, 0.2, o, 200); this.hit(t, 'bandpass', 1500, 0.15, 0.25, o); break;
      case 'bossDown': arp([79, 76, 72, 67, 64, 60], 0.09, 'square', 0.18); break;
      case 'win': arp([72, 76, 79, 84, 79, 84, 88], 0.11, 'square', 0.18); break;
      case 'dead': arp([67, 64, 60, 55], 0.14, 'triangle', 0.25); break;
      case 'respawn': arp([60, 64, 67], 0.07, 'triangle', 0.2); break;
      case 'throw': this.tone('triangle', 500, t, 0.08, 0.1, o, 300); break;
      case 'swoop': this.tone('sawtooth', 900, t, 0.18, 0.06, o, 400); break;
      case 'select': this.tone('square', 660, t, 0.05, 0.1, o); break;
      case 'ok': arp([72, 79], 0.06, 'square', 0.14); break;
      case 'step': this.hit(t, 'lowpass', 600, 0.04, 0.1, o); break;
    }
  }
}
