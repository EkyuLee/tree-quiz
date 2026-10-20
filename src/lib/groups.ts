// 감별 연습 그룹 분할 — 120종을 20개씩 6그룹으로, '섞기'로 재편성
import { SPECIES } from './data';
import { shuffle, type Rng } from './shuffle';

export const GROUP_SIZE = 20;
export const GROUP_COUNT = 6;
const STORAGE_KEY = 'flashcard-groups-v1';

/** 그룹 = 수종 id 배열의 배열 (6 x 20) */
export type Groups = string[][];

/** id 배열을 size개씩 끊어 그룹으로 */
function chunk(ids: string[], size: number): Groups {
  const out: Groups = [];
  for (let i = 0; i < ids.length; i += size) {
    out.push(ids.slice(i, i + size));
  }
  return out;
}

/** 공식 순번 순서 그대로 20개씩 6그룹 (기본 분할) */
export function orderedGroups(): Groups {
  const ids = [...SPECIES].sort((a, b) => a.order - b.order).map((s) => s.id);
  return chunk(ids, GROUP_SIZE);
}

/** 120종을 무작위로 섞어 20개씩 6그룹으로 재편성 */
export function shuffledGroups(rng: Rng = Math.random): Groups {
  const ids = shuffle(
    SPECIES.map((s) => s.id),
    rng,
  );
  return chunk(ids, GROUP_SIZE);
}

/** 저장된 그룹 분할 불러오기(없거나 손상 시 기본 분할) */
export function loadGroups(): Groups {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Groups;
      if (validGroups(parsed)) return parsed;
    }
  } catch {
    /* ignore */
  }
  return orderedGroups();
}

export function saveGroups(groups: Groups): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  } catch {
    /* ignore (용량/프라이빗 모드) */
  }
}

/** 분할이 유효한지: 전체 120종이 중복·누락 없이 들어있는지 */
export function validGroups(groups: Groups): boolean {
  const flat = groups.flat();
  if (flat.length !== SPECIES.length) return false;
  const set = new Set(flat);
  if (set.size !== SPECIES.length) return false;
  for (const s of SPECIES) if (!set.has(s.id)) return false;
  return true;
}
