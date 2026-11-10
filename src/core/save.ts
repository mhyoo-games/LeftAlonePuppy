// 진행 저장 (브라우저 localStorage에 글로 저장 → 여기서는 읽고 쓰는 모양만)
export interface Save { cleared: number; memories: boolean[]; bones: number; best: number[] }

export function newSave(): Save { return { cleared: 0, memories: Array(8).fill(false), bones: 0, best: Array(8).fill(0) }; }

/** 저장된 글을 읽는다. 망가졌거나 모양이 다르면 처음부터 */
export function parseSave(text: string | null): Save {
  const s = newSave();
  if (!text) return s;
  try {
    const d = JSON.parse(text);
    const n = Number(d.cleared);
    s.cleared = Number.isInteger(n) ? Math.max(0, Math.min(8, n)) : 0;
    if (Array.isArray(d.memories)) for (let i = 0; i < 8; i++) s.memories[i] = d.memories[i] === true;
    s.bones = Math.max(0, Math.floor(Number(d.bones) || 0));
    if (Array.isArray(d.best)) for (let i = 0; i < 8; i++) s.best[i] = Math.max(0, Math.floor(Number(d.best[i]) || 0));
  } catch { /* 처음부터 */ }
  return s;
}

/** 스테이지를 깼을 때 */
export function clearStage(s: Save, stage: number, bones: number, memory: boolean): Save {
  const n: Save = { ...s, memories: [...s.memories], best: [...s.best] };
  n.cleared = Math.max(n.cleared, stage);
  if (memory) n.memories[stage - 1] = true;
  n.bones += bones;
  n.best[stage - 1] = Math.max(n.best[stage - 1], bones);
  return n;
}

/** 고를 수 있는 스테이지인지 (깬 곳 + 바로 다음) */
export function unlocked(s: Save, stage: number): boolean { return stage <= s.cleared + 1; }
