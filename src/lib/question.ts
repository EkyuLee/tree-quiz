// 문제 생성 — 사진 선택(최근 회피·부위 다양성), 모드별 문제 구성
import type { AnswerMode, Photo, Question, Species } from '../types';
import { buildChoices } from './distractors';
import { shuffle, shuffleNoConsecutive, type Rng } from './shuffle';

/** 제외되지 않은 사진 */
export function usablePhotos(sp: Species): Photo[] {
  return sp.photos.filter((p) => !p.excluded && p.file);
}

/**
 * 사진 한 장 선택: 최근 본 사진은 피하고, 가능하면 다양한 부위.
 * recentFiles: 최근 보여준 파일 경로
 */
export function pickPhoto(
  sp: Species,
  recentFiles: string[] = [],
  rng: Rng = Math.random,
): Photo | undefined {
  const photos = usablePhotos(sp);
  if (photos.length === 0) return undefined;
  const fresh = photos.filter((p) => !recentFiles.includes(p.file!));
  const pool = fresh.length > 0 ? fresh : photos;
  return shuffle(pool, rng)[0];
}

/**
 * 한 수종에서 서로 다른 사진 n장을 고른다(감별 연습 그리드용).
 * 가능하면 부위(part)가 다양하도록 부위별로 하나씩 우선 채우고, 모자라면 나머지에서 보충.
 * 사진이 n장 미만이면 있는 만큼만 반환한다.
 */
export function pickPhotos(sp: Species, n: number, rng: Rng = Math.random): Photo[] {
  const photos = shuffle(usablePhotos(sp), rng);
  if (photos.length <= n) return photos;

  // 부위 다양성: part별로 1장씩 먼저 뽑고, 부족분은 남은 사진으로 채움
  const byPart = new Map<string, Photo[]>();
  for (const p of photos) {
    const arr = byPart.get(p.part) ?? [];
    arr.push(p);
    byPart.set(p.part, arr);
  }
  const picked: Photo[] = [];
  const used = new Set<Photo>();
  // 1차: 각 부위에서 한 장씩
  for (const arr of byPart.values()) {
    if (picked.length >= n) break;
    picked.push(arr[0]);
    used.add(arr[0]);
  }
  // 2차: 남은 사진으로 채움
  for (const p of photos) {
    if (picked.length >= n) break;
    if (!used.has(p)) {
      picked.push(p);
      used.add(p);
    }
  }
  return picked.slice(0, n);
}

export interface BuildQuestionOpts {
  answerMode: AnswerMode;
  choiceCount?: number; // choice 모드일 때 보기 수
  recentFiles?: (id: string) => string[];
  rng?: Rng;
  allSpecies: Species[];
}

export function buildQuestion(sp: Species, opts: BuildQuestionOpts): Question {
  const rng = opts.rng ?? Math.random;
  const photo = pickPhoto(sp, opts.recentFiles?.(sp.id) ?? [], rng);
  const q: Question = {
    speciesId: sp.id,
    photo,
    answerMode: opts.answerMode,
  };
  if (opts.answerMode === 'choice') {
    q.choices = buildChoices(sp, opts.allSpecies, opts.choiceCount ?? 4, rng);
  }
  return q;
}

/**
 * 수종 목록으로 세션 문제들을 만든다.
 * 같은 수종이 연속으로 나오지 않도록 셔플(교차 학습).
 */
export function buildSession(
  speciesIds: string[],
  getSp: (id: string) => Species | undefined,
  opts: BuildQuestionOpts,
): Question[] {
  const rng = opts.rng ?? Math.random;
  const ordered = shuffleNoConsecutive(speciesIds, (id) => id, rng);
  const qs: Question[] = [];
  for (const id of ordered) {
    const sp = getSp(id);
    if (sp) qs.push(buildQuestion(sp, opts));
  }
  return qs;
}
