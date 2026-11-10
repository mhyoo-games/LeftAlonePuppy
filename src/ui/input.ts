// 키보드·화면 버튼 → 한 프레임의 입력
import type { Input } from '../game/world.ts';

export type Btn = 'left' | 'right' | 'up' | 'down' | 'jump' | 'bark' | 'ok' | 'back';
const KEYS: Record<string, Btn[]> = {
  ArrowLeft: ['left'], KeyA: ['left'], ArrowRight: ['right'], KeyD: ['right'],
  ArrowUp: ['up'], KeyW: ['up'], ArrowDown: ['down'], KeyS: ['down'],
  KeyZ: ['jump', 'ok'], Space: ['jump', 'ok'], KeyK: ['jump'], Enter: ['ok'],
  KeyX: ['bark'], KeyJ: ['bark'],
  Escape: ['back'], KeyP: ['back'], Backspace: ['back'],
};

export class Controls {
  private held = new Set<Btn>();
  private touch = new Map<Btn, number>();      // 버튼 → 누르고 있는 손가락 수
  private pressed = new Set<Btn>();
  onAny: (() => void) | null = null;

  constructor() {
    addEventListener('keydown', (e) => {
      const bs = KEYS[e.code];
      if (!bs) return;
      e.preventDefault();
      if (!e.repeat) for (const b of bs) { if (!this.held.has(b)) this.pressed.add(b); }
      for (const b of bs) this.held.add(b);
      this.onAny?.();
    });
    addEventListener('keyup', (e) => { for (const b of KEYS[e.code] ?? []) this.held.delete(b); });
    addEventListener('blur', () => { this.held.clear(); this.touch.clear(); });
  }

  /** 화면 버튼 연결: data-btn="left" 등 */
  bindButtons(root: HTMLElement): void {
    for (const el of Array.from(root.querySelectorAll<HTMLElement>('[data-btn]'))) {
      const bs = el.dataset.btn!.split(' ') as Btn[];
      const down = (e: PointerEvent) => {
        e.preventDefault(); el.setPointerCapture?.(e.pointerId); el.classList.add('on');
        for (const b of bs) { if (!this.down(b)) this.pressed.add(b); this.touch.set(b, (this.touch.get(b) ?? 0) + 1); }
        this.onAny?.();
        try { navigator.vibrate?.(8); } catch { /* */ }
      };
      const up = (e: PointerEvent) => {
        e.preventDefault(); el.classList.remove('on');
        for (const b of bs) { const n = (this.touch.get(b) ?? 1) - 1; if (n <= 0) this.touch.delete(b); else this.touch.set(b, n); }
      };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    }
  }

  /** 다른 곳에서 누른 것으로 치기 (화면 터치 등) */
  press(b: Btn): void { this.pressed.add(b); }
  down(b: Btn): boolean { return this.held.has(b) || this.touch.has(b); }
  hit(b: Btn): boolean { return this.pressed.has(b); }
  /** 프레임 끝에 부름 */
  endFrame(): void { this.pressed.clear(); }

  game(): Input {
    return {
      left: this.down('left'), right: this.down('right'), down: this.down('down'), jump: this.down('jump'),
      jumpPressed: this.hit('jump'), barkPressed: this.hit('bark'),
    };
  }
}
